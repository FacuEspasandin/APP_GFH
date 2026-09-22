import { Inject, Injectable, Logger } from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import type { Prisma } from '@prisma/client';

import { AlternativasService } from '../alternativas/alternativas.service';
import { CatalogoService } from '../catalogo/catalogo.service';
import { HerramientasService } from '../herramientas/herramientas.service';
import { ClienteAnthropic } from '../../infraestructura/anthropic/cliente-anthropic';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import { RagService } from '../../infraestructura/rag/rag.service';
import { ejecutarTool, TOOLS_CHAT, type DependenciasTools } from './tools';

/**
 * Regla no negociable 1, en el prompt: el modelo nunca decide severidad,
 * dosis ni interacciones "de memoria" — todo sale de las tools, que llaman
 * al mismo motor clínico determinista que usa el resto de la app.
 */
const SYSTEM_PROMPT = `Sos Vera, el asistente de GFH (Gestión Farmacológica Hospitalaria), una app clínica para médicos.

REGLA NO NEGOCIABLE: nunca decidís ni calculás severidad, ajuste de dosis o interacciones "de memoria". Esa información sale EXCLUSIVAMENTE de las tools — llamalas siempre que la pregunta las necesite, y contestá sólo con lo que devuelven. Si una tool no tiene el dato, decilo así ("no tengo esa información cargada"): nunca completes con tu propio conocimiento del modelo.

La mayoría de las tools de fármaco aceptan el NOMBRE directo, no el id — se resuelve solo salvo ambigüedad.

La mayoría de los productos comerciales del catálogo todavía no tiene marca real cargada (son genéricos de desarrollo) — buscá siempre por principio activo, no asumas que un nombre de marca va a aparecer.

NUNCA escribas el nombre técnico de una tool en la respuesta (ej. "Fuente: interacciones_de_un_farmaco") — la app ya muestra de dónde salió cada dato en un chip. Nombrá el origen en lenguaje natural si hace falta.

BREVEDAD (cada token cuesta): andá directo al dato, sin preámbulo ni resumen. Nunca repitas la pregunta ni empieces con frases tipo "Con gusto te cuento" / "Basándome en la información disponible" / "Aquí tenés el detalle". La primera línea YA es información útil. Dale sólo el detalle que la pregunta pide — no agregues secciones extra "por las dudas" si no las pidieron. Si el médico quiere más, va a preguntar.

TOOLS EN PARALELO (cada ida y vuelta cuesta): si necesitás llamar dos o más tools que NO dependen del resultado una de la otra, pedilas TODAS en la misma respuesta, no una por vez (ej. "ajuste_renal" para varios ClCr a la vez). Sólo andá secuencial cuando una depende de lo que devolvió otra.

FORMATO: la app te muestra en burbujas de chat, no en un visor de markdown completo. Podés usar **negrita** y listas con "- ". NUNCA uses tablas markdown (con "|") — reformulalo como lista, una línea por fila. Nunca uses encabezados con "#".`;

/** Tope de idas y vueltas de tool-use por mensaje — corta un loop si el
 *  modelo insiste en pedir tools sin llegar nunca a una respuesta final. */
const MAX_VUELTAS_TOOL_USE = 6;

/** Ventana de historial que se reenvía en cada mensaje de una sesión
 *  existente — últimos 5 intercambios (usuario+asistente). Sin esto, un
 *  "¿y con ClCr 35?" no sabe de qué fármaco se venía hablando (bug real,
 *  encontrado probando la app). Con ventana y no historial completo: una
 *  sesión larga no hace crecer el costo de cada mensaje sin límite. Se
 *  reenvía el texto final de cada turno, no los tool_use/tool_result
 *  intermedios — alcanza para dar contexto, no hace falta repetir cómo se
 *  llegó al dato. */
const VENTANA_HISTORIAL_MENSAJES = 10;

export interface RespuestaChat {
  sessionId: string;
  respuesta: string;
  toolsUsadas: Array<{ tool: string; input: unknown }>;
}

@Injectable()
export class ChatIaService {
  private readonly logger = new Logger(ChatIaService.name);

  constructor(
    @Inject(ClienteAnthropic) private readonly cliente: ClienteAnthropic,
    @Inject(CatalogoService) private readonly catalogo: CatalogoService,
    @Inject(HerramientasService) private readonly herramientas: HerramientasService,
    @Inject(AlternativasService) private readonly alternativas: AlternativasService,
    @Inject(RagService) private readonly rag: RagService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async responder(medicoId: string, params: { sessionId?: string; pregunta: string }): Promise<RespuestaChat> {
    const deps: DependenciasTools = {
      catalogo: this.catalogo,
      herramientas: this.herramientas,
      alternativas: this.alternativas,
      rag: this.rag,
    };

    const sesionExistente = params.sessionId
      ? await this.prisma.chatSession.findFirst({ where: { id: params.sessionId, medicoId } })
      : null;

    const chatSession =
      sesionExistente ??
      (await this.prisma.chatSession.create({
        data: { medicoId, titulo: params.pregunta.slice(0, 80) },
      }));

    const historialPrevio = sesionExistente
      ? (
          await this.prisma.chatMessage.findMany({
            where: { chatSessionId: sesionExistente.id },
            orderBy: { createdAt: 'desc' },
            take: VENTANA_HISTORIAL_MENSAJES,
            select: { rol: true, contenido: true },
          })
        ).reverse()
      : [];

    const mensajes: MessageParam[] = [
      ...historialPrevio.map(
        (m): MessageParam => ({
          role: m.rol === 'USUARIO' ? 'user' : 'assistant',
          content: m.contenido,
        }),
      ),
      { role: 'user', content: params.pregunta },
    ];
    const toolsUsadas: Array<{ tool: string; input: unknown; output: unknown }> = [];

    let respuestaFinal = '';

    for (let vuelta = 0; vuelta < MAX_VUELTAS_TOOL_USE; vuelta++) {
      const respuesta = await this.cliente.enviarMensaje({
        sistema: SYSTEM_PROMPT,
        mensajes,
        tools: TOOLS_CHAT,
      });

      // Visibilidad de costo real: sin esto, si la caché deja de pegar (un
      // cambio en el prompt que invalida el breakpoint, por ejemplo) se nota
      // recién en la factura de Anthropic, no en los logs.
      this.logger.debug(
        `Vuelta ${vuelta + 1}: input=${respuesta.usage.input_tokens} ` +
          `cache_read=${respuesta.usage.cache_read_input_tokens ?? 0} ` +
          `cache_write=${respuesta.usage.cache_creation_input_tokens ?? 0} ` +
          `output=${respuesta.usage.output_tokens}`,
      );

      mensajes.push({ role: 'assistant', content: respuesta.content });

      if (respuesta.stop_reason !== 'tool_use') {
        respuestaFinal = this.extraerTexto(respuesta);
        break;
      }

      const bloquesTool = respuesta.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );
      const resultados: ToolResultBlockParam[] = [];

      for (const bloque of bloquesTool) {
        try {
          const salida = await ejecutarTool(bloque.name, bloque.input, deps);
          toolsUsadas.push({ tool: bloque.name, input: bloque.input, output: salida });
          resultados.push({ type: 'tool_result', tool_use_id: bloque.id, content: JSON.stringify(salida) });
        } catch (e) {
          this.logger.warn(`Tool "${bloque.name}" falló: ${String(e)}`);
          resultados.push({
            type: 'tool_result',
            tool_use_id: bloque.id,
            content: e instanceof Error ? e.message : String(e),
            is_error: true,
          });
        }
      }

      mensajes.push({ role: 'user', content: resultados });
    }

    if (!respuestaFinal) {
      respuestaFinal = 'No pude terminar de responder esta vez — probá reformular la pregunta.';
    }

    await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { chatSessionId: chatSession.id, medicoId, rol: 'USUARIO', contenido: params.pregunta },
      }),
      this.prisma.chatMessage.create({
        data: {
          chatSessionId: chatSession.id,
          medicoId,
          rol: 'ASISTENTE',
          contenido: respuestaFinal,
          toolLlamada:
            toolsUsadas.length > 0
              ? (toolsUsadas.map((t) => ({ tool: t.tool, input: t.input })) as unknown as Prisma.InputJsonValue)
              : undefined,
        },
      }),
    ]);

    return {
      sessionId: chatSession.id,
      respuesta: respuestaFinal,
      toolsUsadas: toolsUsadas.map((t) => ({ tool: t.tool, input: t.input })),
    };
  }

  private extraerTexto(mensaje: Anthropic.Message): string {
    return mensaje.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  }
}
