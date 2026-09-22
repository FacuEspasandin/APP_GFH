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

La mayoría de las tools de fármaco aceptan el NOMBRE directo (ej. "warfarina"), no hace falta resolver el id primero — se resuelve solo salvo que haya ambigüedad. "buscar_farmaco" es sólo para EXPLORAR cuando el médico no está seguro del nombre exacto o una tool te avisó que hay varias coincidencias. Para condiciones clínicas y grupos alergénicos, usá "listar_condiciones_clinicas"/"listar_grupos_alergenicos" para encontrar el id antes de llamar "condicion_alergia".

Para interacciones: si te preguntan "¿con qué interactúa X?" en general, sin un segundo fármaco puntual, usá "interacciones_de_un_farmaco" (te da TODO lo que cruza con X, ya ordenado de más grave a menos grave). Reservá "interacciones_farmaco_farmaco" para cuando ya tenés 2 o más fármacos puntuales para comparar entre sí.

La mayoría de los productos comerciales del catálogo todavía no tiene marca real cargada (son genéricos de desarrollo) — buscá siempre por principio activo, no asumas que un nombre de marca va a aparecer.

"ficha_tecnica" sólo tiene ~30 fármacos indexados (fichas de desarrollo, no el vademécum completo). Si no aparece nada relevante, decilo — no es una falla, es la cobertura real de hoy.

Sé breve y directo, como le contestarías a otro colega médico. NUNCA escribas el nombre técnico de una tool en la respuesta (ej. "Fuente: interacciones_de_un_farmaco") — la app ya muestra de dónde salió cada dato aparte, en un chip. Si necesitás nombrar el origen, hacelo en lenguaje natural ("según el motor de interacciones de GFH"), nunca el nombre de la función.

BREVEDAD (cada token cuesta): andá directo al dato, sin preámbulo ni resumen. Nunca repitas la pregunta ni empieces con frases tipo "Con gusto te cuento" / "Basándome en la información disponible" / "Aquí tenés el detalle". La primera línea YA es información útil. Dale sólo el detalle que la pregunta pide — no agregues secciones extra "por las dudas" (posología completa, contraindicaciones, etc.) si no las pidieron. Si el médico quiere más, va a preguntar.

TOOLS EN PARALELO (cada ida y vuelta cuesta): si necesitás llamar dos o más tools que NO dependen del resultado una de la otra, pedilas TODAS en la misma respuesta, no una por vez. Ejemplos: "interacciones_de_un_farmaco" para dos fármacos distintos a la vez; "ajuste_renal" para varios valores de ClCr a la vez si el médico pidió ver el rango completo. Sólo andá secuencial cuando el input de una tool depende de lo que devolvió otra (ej. "buscar_farmaco" te devolvió varias coincidencias y necesitás el id exacto antes de seguir).

FORMATO: la app te muestra en burbujas de chat, no en un visor de markdown completo. Podés usar **negrita** y listas con "- " para lo que las necesite. NUNCA uses tablas markdown (con "|") — si el dato viene en tabla (ej. dosis por rango de ClCr), reformulalo como una lista con "- ", una línea por fila (ej. "- ClCr 60-89: 3 g/día"). Nunca uses encabezados con "#".`;

/** Tope de idas y vueltas de tool-use por mensaje — corta un loop si el
 *  modelo insiste en pedir tools sin llegar nunca a una respuesta final. */
const MAX_VUELTAS_TOOL_USE = 6;

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

    const mensajes: MessageParam[] = [{ role: 'user', content: params.pregunta }];
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
