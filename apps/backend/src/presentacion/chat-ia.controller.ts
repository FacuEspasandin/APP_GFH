import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

import { ChatIaService } from '../aplicacion/chat-ia/chat-ia.service';
import { Cuerpo } from './comun/cuerpo';
import { LimiteChatDiarioGuard } from './comun/limite-chat-diario.guard';
import { JwtGuard, MedicoActual } from './comun/medico-actual';
import { DePago } from './comun/requiere-suscripcion';

export class EnviarMensajeChatDto {
  @IsOptional() @IsUUID() sessionId?: string;
  @IsString() @Length(1, 2000) pregunta!: string;
}

/**
 * Vera — responde apoyándose en las tools deterministas del motor clínico,
 * nunca en conocimiento propio del modelo (regla no negociable 1).
 *
 * Throttle bajo: un solo mensaje puede disparar varias llamadas a Claude
 * (loop de tool-use) y tiene costo real por token — mismo criterio que
 * `ayuda/reportes`, pero más restrictivo por el costo mayor.
 */
@Controller('chat')
@UseGuards(JwtGuard)
export class ChatIaController {
  constructor(@Inject(ChatIaService) private readonly chat: ChatIaService) {}

  @DePago('Vera')
  @UseGuards(LimiteChatDiarioGuard)
  @Post('mensajes')
  @HttpCode(200)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  mensaje(@MedicoActual() medicoId: string, @Cuerpo(EnviarMensajeChatDto) dto: EnviarMensajeChatDto) {
    return this.chat.responder(medicoId, { sessionId: dto.sessionId, pregunta: dto.pregunta });
  }
}
