/**
 * Identidad del médico que hace el request, resuelta desde el access token.
 *
 * Este es el único lugar del backend que sabe cómo se autentica: todo lo demás
 * recibe `medicoId` y lo pone en el `where`. Cuando esto era provisorio
 * —leía una cabecera `x-medico-id`— el resto del código no cambió al pasar a
 * JWT, que es exactamente el punto de haberlo aislado desde el principio.
 */

import {
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';

export interface RequestConMedico extends FastifyRequest {
  medicoId?: string;
  /** La sesión desde la que llega este request. Ausente en tokens emitidos
   *  antes de que el payload la incluyera: se cae con gracia a no marcar
   *  ninguna, y se corrige solo al primer refresh. */
  sesionId?: string;
}

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const request = contexto.switchToHttp().getRequest<RequestConMedico>();
    const cabecera = request.headers.authorization;

    if (typeof cabecera !== 'string' || !cabecera.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de acceso.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid?: string }>(cabecera.slice(7));
      request.medicoId = payload.sub;
      request.sesionId = payload.sid;
      return true;
    } catch {
      // No se distingue token expirado de token inválido hacia afuera: el
      // cliente reintenta con el refresh en los dos casos.
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}

/**
 * De qué sesión viene el request.
 *
 * Existe para una sola cosa: que la lista de sesiones pueda marcar «esta» y no
 * ofrecer cerrarla. Devuelve `undefined` con un token viejo, y quien lo use
 * tiene que tolerarlo — no es un error, es un token que se va a renovar en
 * quince minutos.
 */
export const SesionActual = createParamDecorator((_dato: unknown, contexto: ExecutionContext) => {
  return contexto.switchToHttp().getRequest<RequestConMedico>().sesionId;
});

export const MedicoActual = createParamDecorator((_dato: unknown, contexto: ExecutionContext) => {
  const request = contexto.switchToHttp().getRequest<RequestConMedico>();
  if (!request.medicoId) {
    throw new UnauthorizedException('Falta identificar al médico.');
  }
  return request.medicoId;
});
