import { CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { LIMITE_CONSULTAS_CHAT_24H } from '../../aplicacion/chat-ia/limites';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import type { RequestConMedico } from './medico-actual';

export { LIMITE_CONSULTAS_CHAT_24H };

/**
 * Rechazo temprano y barato de quien ya llegó al tope. NO es el control real:
 * entre este conteo y el mensaje que se guarda pasa la llamada a Claude, y N
 * pedidos simultáneos ven todos "9 usadas". El que decide es
 * `ChatIaService.reservarConsulta`, que cuenta y guarda en una transacción.
 */
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
