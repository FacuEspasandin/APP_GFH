import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages';

/** Mismo modelo que confirmamos vigente para esto: Sonnet 5. */
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
        system: params.sistema,
        messages: params.mensajes,
        tools: params.tools,
      });
    } catch (e) {
      this.logger.error(`Falló la llamada a Anthropic: ${String(e)}`);
      throw new ServiceUnavailableException('El chat no pudo responder. Intentá de nuevo.');
    }
  }
}
