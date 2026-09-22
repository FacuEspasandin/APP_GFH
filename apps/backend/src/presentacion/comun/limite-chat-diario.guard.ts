import { CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import type { RequestConMedico } from './medico-actual';

/**
 * Tope de consultas a Vera por médico — protege el margen contra un uso
 * atípico muy por encima del promedio asumido al fijar el precio (8,5/día).
 *
 * Ventana móvil de 24 h, no "desde medianoche": evita que el corte dependa
 * de en qué huso horario corre el servidor (el VPS puede arrancar en UTC,
 * los médicos están en Uruguay, UTC-3 — con medianoche fija el reset
 * ocurriría a las 21 h hora local, no a medianoche real).
 */
export const LIMITE_CONSULTAS_CHAT_24H = 10;

@Injectable()
export class LimiteChatDiarioGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const request = contexto.switchToHttp().getRequest<RequestConMedico>();
    const medicoId = request.medicoId;
    if (!medicoId) return false;

    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const consultas = await this.prisma.chatMessage.count({
      where: { medicoId, rol: 'USUARIO', createdAt: { gte: hace24Horas } },
    });

    if (consultas >= LIMITE_CONSULTAS_CHAT_24H) {
      throw new ForbiddenException({
        codigo: 'LIMITE_CHAT_DIARIO',
        mensaje: `Llegaste al límite de ${LIMITE_CONSULTAS_CHAT_24H} consultas a Vera en las últimas 24 horas. Probá de nuevo más tarde.`,
      });
    }

    return true;
  }
}
