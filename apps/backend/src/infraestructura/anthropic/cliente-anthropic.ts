import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages';

/** Confirmado vigente para esto: Sonnet 5. Haiku 4.5 se probó en vivo dos
 *  veces — alucinó una severidad de interacción inexistente, y por
 *  separado, para preguntas de sólo ficha_tecnica, en 3 de 4 intentos NO
 *  llamó la tool disponible y respondió "no tengo esa información" cuando
 *  sí estaba indexada. Descartado en los dos casos. */
const MODELO = 'claude-sonnet-5';
const MAX_TOKENS_RESPUESTA = 1024;

/**
 * Cliente al SDK de Anthropic, para el tool-use loop del chat.
 *
 * Mismo criterio que `AyudaService`/Resend: la respuesta ES la
 * funcionalidad, así que los errores se **propagan** como
 * `ServiceUnavailableException` — nunca se tragan como hace `PushService`.
 */
@Injectable()
export class ClienteAnthropic {
  private readonly logger = new Logger(ClienteAnthropic.name);
  private cliente: Anthropic | null = null;

  private obtenerCliente(): Anthropic {
    const claveApi = process.env.ANTHROPIC_API_KEY;
    if (!claveApi) {
      throw new ServiceUnavailableException('El chat con IA no está configurado todavía.');
    }
    if (!this.cliente) this.cliente = new Anthropic({ apiKey: claveApi });
    return this.cliente;
  }

  /**
   * `sistema` va como bloque con `cache_control` — es idéntico en TODAS las
   * llamadas (mismo texto, mismas tools) para TODOS los médicos, así que
   * cachearlo es directo. El orden real del request es `tools` → `system` →
   * `messages`, así que UN solo breakpoint acá alcanza para cachear las 10
   * tools completas también (cachea todo el prefijo, no sólo este bloque).
   * TTL 1 hora (`ttl: '1h'`) en vez del default de 5 min: con tráfico real
   * de consultorio (huecos entre consultas) mantiene la caché caliente sin
   * pagar el "cache write" de nuevo cada rato.
   */
  async enviarMensaje(params: {
    sistema: string;
    mensajes: MessageParam[];
    tools: Tool[];
  }): Promise<Anthropic.Message> {
    const cliente = this.obtenerCliente();

    try {
      return await cliente.messages.create({
        model: MODELO,
        max_tokens: MAX_TOKENS_RESPUESTA,
        system: [
          {
            type: 'text',
            text: params.sistema,
            cache_control: { type: 'ephemeral', ttl: '1h' },
          },
        ],
        messages: params.mensajes,
        tools: params.tools,
      });
    } catch (e) {
      this.logger.error(`Falló la llamada a Anthropic: ${String(e)}`);
      throw new ServiceUnavailableException('El chat no pudo responder. Intentá de nuevo.');
    }
  }
}
