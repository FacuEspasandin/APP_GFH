import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
 *  existente — últimos 10 intercambios (usuario+asistente). Sin esto, un
 *  "¿y con ClCr 35?" no sabe de qué fármaco se venía hablando (bug real,
 *  encontrado probando la app). Con ventana y no historial completo: una
 *  sesión larga no hace crecer el costo de cada mensaje sin límite. Se
 *  reenvía el texto final de cada turno, no los tool_use/tool_result
 *  intermedios — alcanza para dar contexto, no hace falta repetir cómo se
 *  llegó al dato.
 *
 *  20 y no 10: medido en vivo, el breakpoint de caché de abajo (`UMBRAL_...
 *  PARA_CACHE`) sólo lee incremental mientras la ventana NO se corre — en
 *  cuanto se llena y empieza a descartar los mensajes más viejos, el
 *  prefijo cacheado deja de matchear y cada turno paga un cache write
 *  completo de nuevo. Con 20, una consulta típica (rara vez pasa de 10
 *  intercambios) nunca llega a correr la ventana. */
const VENTANA_HISTORIAL_MENSAJES = 20;

/** A partir de qué tamaño de historial se cachea (2+ intercambios previos =
 *  turno 3+). Menos que esto y la sesión más común (1-2 turnos) pagaría un
 *  cache write que nunca llega a leerse — negativo neto. Desde el turno 3,
 *  el historial reenviado ya es texto estable (mismo query a la DB, mismo
 *  mapeo) entre esta llamada y la siguiente: cachearlo ahorra reenviarlo
 *  fresco en cada pregunta nueva de una conversación larga. */
const UMBRAL_MENSAJES_HISTORIAL_PARA_CACHE = 4;

export interface RespuestaChat {
  sessionId: string;
  respuesta: string;
  toolsUsadas: Array<{ tool: string; input: unknown; encontrado?: boolean }>;
}

/** Sólo para `ficha_tecnica`: la tool devuelve siempre los 5 fragmentos más
 *  cercanos del índice completo (`RagService.buscar`), relevantes o no. El
 *  chip de fuente en la app necesita saber si hubo algo citable — pero un
 *  corte por distancia NO sirve para eso: medido en vivo, una búsqueda
 *  irrelevante ("ibuprofeno" contra un índice sin ibuprofeno) da distancia
 *  ~0,39, y una relevante ("metformina" contra Metformina) da ~0,29-0,32 —
 *  los rangos se pisan, no hay umbral que los separe. En cambio, si el
 *  NOMBRE del principio activo que devolvió la búsqueda aparece en el texto
 *  de la pregunta, es una señal determinista de que sí se está hablando de
 *  ese fármaco — sin usar la distancia para nada. */
function huboFichaRelevante(output: unknown, pregunta: string): boolean {
  if (!Array.isArray(output)) return false;
  const preguntaNormalizada = normalizarTexto(pregunta);
  return output.some(
    (r) =>
      typeof r === 'object' &&
      r !== null &&
      typeof (r as { nombrePrincipioActivo?: unknown }).nombrePrincipioActivo === 'string' &&
      preguntaNormalizada.includes(normalizarTexto((r as { nombrePrincipioActivo: string }).nombrePrincipioActivo)),
  );
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
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

    const mensajesHistorial: MessageParam[] = historialPrevio.map(
      (m): MessageParam => ({
        role: m.rol === 'USUARIO' ? 'user' : 'assistant',
        content: m.contenido,
      }),
    );

    if (mensajesHistorial.length >= UMBRAL_MENSAJES_HISTORIAL_PARA_CACHE) {
      const ultimo = mensajesHistorial[mensajesHistorial.length - 1]!;
      mensajesHistorial[mensajesHistorial.length - 1] = {
        ...ultimo,
        content: [{ type: 'text', text: ultimo.content as string, cache_control: { type: 'ephemeral', ttl: '1h' } }],
      };
    }

    const mensajes: MessageParam[] = [...mensajesHistorial, { role: 'user', content: params.pregunta }];
    const toolsUsadas: Array<{ tool: string; input: unknown; output: unknown }> = [];

    let respuestaFinal = '';
    let reintentoPorCorteHecho = false;

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
        `Vuelta ${vuelta + 1}: stop_reason=${respuesta.stop_reason} input=${respuesta.usage.input_tokens} ` +
          `cache_read=${respuesta.usage.cache_read_input_tokens ?? 0} ` +
          `cache_write=${respuesta.usage.cache_creation_input_tokens ?? 0} ` +
          `output=${respuesta.usage.output_tokens}`,
      );

      mensajes.push({ role: 'assistant', content: respuesta.content });

      if (respuesta.stop_reason !== 'tool_use') {
        const texto = this.extraerTexto(respuesta);

        // Visto en vivo (dos veces seguidas, misma pregunta): el modelo
        // termina con stop_reason "end_turn" a mitad de una oración — no es
        // max_tokens, el modelo mismo decide que terminó. Un dato clínico
        // cortado ("cambiar a una estatina no dependiente de...") es peor
        // que no decirlo, así que se reintenta UNA vez pidiendo que
        // complete, en vez de mandarlo así al médico.
        if (!reintentoPorCorteHecho && this.pareceCortada(texto)) {
          reintentoPorCorteHecho = true;
          respuestaFinal = texto;
          mensajes.push({
            role: 'user',
            content:
              'Tu respuesta anterior quedó cortada a mitad de oración. Continuá EXACTAMENTE desde donde quedó, sin repetir nada de lo ya dicho.',
          });
          continue;
        }

        respuestaFinal = reintentoPorCorteHecho ? `${respuestaFinal} ${texto}`.trim() : texto;
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

    // Con esto se puede comparar lo que el backend REALMENTE mandó contra lo
    // que la app terminó mostrando — sin el texto completo acá, un corte que
    // reporta el médico no se puede distinguir entre "lo generó cortado" y
    // "la app lo cortó al renderizar".
    this.logger.debug(
      `Respuesta final: ${respuestaFinal.length} caracteres, termina en "${respuestaFinal.slice(-30)}"`,
    );

    // Calculado una sola vez: se guarda en `toolLlamada` Y se devuelve en la
    // respuesta — antes se recalculaba distinto en cada lado y una sesión
    // retomada del historial se quedaba sin poder saber si el chip de "Ficha
    // técnica" correspondía mostrarse (`encontrado` no viajaba a la base).
    const toolsConMetadata = toolsUsadas.map((t) => ({
      tool: t.tool,
      input: t.input,
      ...(t.tool === 'ficha_tecnica'
        ? {
            encontrado: huboFichaRelevante(
              t.output,
              typeof t.input === 'object' && t.input !== null && 'pregunta' in t.input
                ? String((t.input as { pregunta: unknown }).pregunta)
                : '',
            ),
          }
        : {}),
    }));

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
            toolsConMetadata.length > 0 ? (toolsConMetadata as unknown as Prisma.InputJsonValue) : undefined,
        },
      }),
    ]);

    return {
      sessionId: chatSession.id,
      respuesta: respuestaFinal,
      toolsUsadas: toolsConMetadata,
    };
  }

  /** Últimas conversaciones del médico, para la lista de historial — nunca
   *  de otro médico, sin importar qué `medicoId` venga en la URL. */
  async listarSesiones(medicoId: string, limite = 20) {
    const sesiones = await this.prisma.chatSession.findMany({
      where: { medicoId },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: { _count: { select: { mensajes: true } } },
    });

    return sesiones.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      createdAt: s.createdAt,
      cantidadMensajes: s._count.mensajes,
    }));
  }

  /** Los mensajes de una conversación, para retomarla. `NotFoundException`
   *  tanto si no existe como si es de otro médico — misma respuesta para
   *  las dos, no hay que distinguirle al médico cuál de las dos pasó. */
  async obtenerMensajes(medicoId: string, sessionId: string) {
    const sesion = await this.prisma.chatSession.findFirst({ where: { id: sessionId, medicoId } });
    if (!sesion) throw new NotFoundException('Conversación no encontrada.');

    const mensajes = await this.prisma.chatMessage.findMany({
      where: { chatSessionId: sessionId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, rol: true, contenido: true, toolLlamada: true },
    });

    return {
      sessionId: sesion.id,
      titulo: sesion.titulo,
      mensajes: mensajes.map((m) => ({
        id: m.id,
        rol: m.rol,
        contenido: m.contenido,
        toolsUsadas: (m.toolLlamada as unknown as RespuestaChat['toolsUsadas'] | null) ?? [],
      })),
    };
  }

  private extraerTexto(mensaje: Anthropic.Message): string {
    return mensaje.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  }

  /** Heurística angosta a propósito: NO exige terminar en punto (una
   *  respuesta corta tipo "Dosis: 500mg cada 8h" es válida sin punto final),
   *  sólo detecta que la ÚLTIMA palabra sea una que en español nunca cierra
   *  una oración (preposición, artículo, conjunción) — la misma familia de
   *  palabra en la que se cortó el caso real que motivó esto ("...no
   *  dependiente de"). */
  private pareceCortada(texto: string): boolean {
    const PALABRAS_QUE_NUNCA_TERMINAN_UNA_ORACION = new Set([
      'de', 'a', 'en', 'con', 'para', 'por', 'sin', 'sobre', 'entre', 'hacia', 'según',
      'durante', 'mediante', 'y', 'o', 'u', 'e', 'ni', 'que', 'el', 'la', 'los', 'las',
      'un', 'una', 'unos', 'unas', 'del', 'al', 'su', 'sus', 'como',
    ]);

    const lineas = texto.trim().split('\n').filter((l) => l.trim().length > 0);
    const ultimaLinea = lineas[lineas.length - 1] ?? '';
    const palabras = ultimaLinea.trim().split(/\s+/);
    const ultimaPalabra = (palabras[palabras.length - 1] ?? '')
      .toLowerCase()
      .replace(/[.,;:!?"')\]]+$/, '');

    return PALABRAS_QUE_NUNCA_TERMINAN_UNA_ORACION.has(ultimaPalabra);
  }
}
