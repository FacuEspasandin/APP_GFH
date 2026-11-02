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
import { VERSION_CONSENTIMIENTO } from '@gfh/shared-types';

import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import type { RequestConMedico } from './medico-actual';

/**
 * Marca una ruta que manda datos a un tercero con inteligencia artificial u OCR
 * (Vera → Anthropic, foto → Google Cloud Vision) y por eso necesita el permiso
 * expreso del médico.
 *
 * Se pide en la app antes de la primera vez, pero la app no es la garantía: un
 * cliente viejo, modificado o un script puede saltearla. Este guard es el que
 * decide, igual que `PlanGuard` con los planes — y cuenta el permiso vigente
 * (la versión del texto actual), no uno viejo.
 *
 * Devuelve `CONSENTIMIENTO_REQUERIDO` con el tipo, que la app traduce a abrir el
 * pedido de permiso en vez de mostrar un error.
 */
export const CLAVE_CONSENTIMIENTO = 'gfh:consentimiento';
export const CODIGO_CONSENTIMIENTO_REQUERIDO = 'CONSENTIMIENTO_REQUERIDO';

const CAMPOS: Record<'VERA' | 'FOTO', 'consentimientoVeraVersion' | 'consentimientoFotoVersion'> = {
  VERA: 'consentimientoVeraVersion',
  FOTO: 'consentimientoFotoVersion',
};

@Injectable()
export class ConsentimientoGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const tipo = this.reflector.getAllAndOverride<'VERA' | 'FOTO' | undefined>(CLAVE_CONSENTIMIENTO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!tipo) return true;

    const request = contexto.switchToHttp().getRequest<RequestConMedico>();
    const medicoId = request.medicoId;
    if (!medicoId) return false;

    const campo = CAMPOS[tipo];
    const medico = await this.prisma.medico.findUnique({
      where: { id: medicoId },
      select: { [campo]: true },
    });
    const aceptada = (medico as Record<string, string | null> | null)?.[campo] ?? null;

    if (aceptada === VERSION_CONSENTIMIENTO[tipo]) return true;

    throw new ForbiddenException({
      codigo: CODIGO_CONSENTIMIENTO_REQUERIDO,
      tipo,
      mensaje:
        tipo === 'VERA'
          ? 'Para usar Vera tenés que aceptar que tus preguntas se envíen a su proveedor de inteligencia artificial.'
          : 'Para cargar por foto tenés que aceptar que la imagen se envíe a su proveedor de reconocimiento de texto.',
    });
  }
}

/** `@RequiereConsentimiento('VERA')` — va en el handler que sale hacia el tercero. */
export function RequiereConsentimiento(tipo: 'VERA' | 'FOTO') {
  return applyDecorators(SetMetadata(CLAVE_CONSENTIMIENTO, tipo), UseGuards(ConsentimientoGuard));
}
