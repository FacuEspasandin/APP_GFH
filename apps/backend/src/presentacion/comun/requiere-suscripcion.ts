import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AccesoService } from '../../aplicacion/suscripcion/acceso.service';
import { CODIGO_LIMITE_PLAN_GRATIS } from '../../aplicacion/suscripcion/plan';
import type { RequestConMedico } from './medico-actual';

/**
 * Marca una ruta como de pago.
 *
 * Se pone en el controlador y no en el servicio a propósito: así se lee de un
 * vistazo qué endpoints están del otro lado del muro, y agregar uno nuevo sin
 * marcarlo se nota leyendo el archivo.
 *
 * El guard corre DESPUÉS del de JWT —primero quién sos, después si pagaste— y
 * devuelve `LIMITE_PLAN_GRATIS`, que la app traduce a abrir el paywall.
 */
export const CLAVE_DE_PAGO = 'gfh:de-pago';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccesoService) private readonly acceso: AccesoService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const descripcion = this.reflector.getAllAndOverride<string | undefined>(CLAVE_DE_PAGO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!descripcion) return true;

    const request = contexto.switchToHttp().getRequest<RequestConMedico>();
    const medicoId = request.medicoId;
    if (!medicoId) return false;

    if (await this.acceso.tieneSuscripcion(medicoId)) return true;

    throw new ForbiddenException({
      codigo: CODIGO_LIMITE_PLAN_GRATIS,
      mensaje: `${descripcion} necesita suscripción.`,
    });
  }
}

/** `@DePago('Crear un paciente')` — el texto va al pop-up de la app. */
export function DePago(descripcion: string) {
  return applyDecorators(SetMetadata(CLAVE_DE_PAGO, descripcion), UseGuards(PlanGuard));
}
