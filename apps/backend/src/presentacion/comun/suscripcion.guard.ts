import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';

import { SuscripcionService } from '../../aplicacion/suscripcion/suscripcion.service';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import type { RequestConMedico } from './medico-actual';

/**
 * Exige suscripción vigente para llegar a los datos clínicos.
 *
 * Va DESPUÉS del guard de JWT: primero se sabe quién es, después si pagó.
 *
 * Apagado por defecto y encendido con `EXIGIR_SUSCRIPCION=1`. No es una puerta
 * trasera: sin RevenueCat integrado nadie tiene fila de suscripción, así que
 * encenderlo hoy dejaría afuera hasta al usuario de demostración. Antes de
 * producción tiene que estar en 1 — el acceso es 100% de pago desde el día uno.
 *
 * Devuelve un código propio (`SUSCRIPCION_VENCIDA`) para que la app sepa
 * mandar a la pantalla de bloqueo en vez de tratarlo como un error genérico.
 */
@Injectable()
export class SuscripcionGuard implements CanActivate {
  private readonly logger = new Logger(SuscripcionGuard.name);
  private avisado = false;

  constructor(
    @Inject(SuscripcionService) private readonly suscripcion: SuscripcionService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    if (process.env.EXIGIR_SUSCRIPCION !== '1') {
      if (!this.avisado) {
        this.logger.warn(
          'EXIGIR_SUSCRIPCION no está en 1: el acceso clínico no valida suscripción. ' +
            'Tiene que estar encendido en producción.',
        );
        this.avisado = true;
      }
      return true;
    }

    const request = contexto.switchToHttp().getRequest<RequestConMedico>();
    const medicoId = request.medicoId;
    if (!medicoId) return false;

    const medico = await this.prisma.medico.findUnique({
      where: { id: medicoId },
      select: { rol: true },
    });
    // Los roles de administración no pagan: no son clientes.
    if (medico?.rol === 'ADMIN' || medico?.rol === 'SUPERADMIN') return true;

    if (await this.suscripcion.tieneAcceso(medicoId)) return true;

    throw new ForbiddenException({
      codigo: 'SUSCRIPCION_VENCIDA',
      mensaje: 'Necesitás una suscripción vigente para acceder.',
    });
  }
}
