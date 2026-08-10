/**
 * Formato de respuesta consistente en toda la API (Opciones_stack.md, "API").
 *
 *   éxito: { success: true,  data: {...}, message: "" }
 *   error: { success: false, error: { code, message } }
 */

import {
  CallHandler,
  ExceptionFilter,
  ArgumentsHost,
  Catch,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { map, type Observable } from 'rxjs';

export interface RespuestaOk<T> {
  success: true;
  data: T;
  message: string;
}

export interface RespuestaError {
  success: false;
  error: {
    code: string;
    message: string;
    /** Presente sólo cuando la excepción trae código propio: lleva el cuerpo
     *  completo, con las coincidencias de alergia y demás. */
    detalle?: unknown;
  };
}

@Injectable()
export class EnvolturaRespuestaInterceptor<T> implements NestInterceptor<T, RespuestaOk<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<RespuestaOk<T>> {
    return next.handle().pipe(map((data) => ({ success: true as const, data, message: '' })));
  }
}

@Catch()
export class FiltroExcepciones implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcepciones.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<FastifyReply>();

    if (excepcion instanceof HttpException) {
      const estado = excepcion.getStatus();
      const cuerpo = excepcion.getResponse();

      // Una excepción puede traer su propio código —`ALERGIA_BLOQUEA`,
      // `SUSCRIPCION_VENCIDA`— y la app decide qué hacer con él. Sin esto
      // llegaban todos aplastados al genérico del status (`CONFLICTO`,
      // `SIN_PERMISO`) y el cliente no podía distinguir un 409 que se puede
      // confirmar de uno que no.
      const propio =
        typeof cuerpo === 'object' && cuerpo !== null
          ? (cuerpo as { codigo?: string; mensaje?: string; message?: string | string[] })
          : null;

      const mensaje =
        typeof cuerpo === 'string'
          ? cuerpo
          : (propio?.mensaje ?? propio?.message ?? excepcion.message);

      void respuesta.status(estado).send({
        success: false,
        error: {
          code: propio?.codigo ?? codigoDesdeEstado(estado),
          message: Array.isArray(mensaje) ? mensaje.join('. ') : mensaje,
          ...(propio?.codigo ? { detalle: cuerpo } : {}),
        },
      } as RespuestaError);
      return;
    }

    // Nunca devolver el stack ni el mensaje crudo al cliente: puede filtrar
    // estructura interna. Se registra del lado del servidor.
    this.logger.error(excepcion instanceof Error ? excepcion.stack : String(excepcion));
    void respuesta.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado.' },
    } satisfies RespuestaError);
  }
}

function codigoDesdeEstado(estado: number): string {
  switch (estado) {
    case HttpStatus.BAD_REQUEST:
      return 'DATOS_INVALIDOS';
    case HttpStatus.UNAUTHORIZED:
      return 'NO_AUTENTICADO';
    case HttpStatus.FORBIDDEN:
      return 'SIN_PERMISO';
    case HttpStatus.NOT_FOUND:
      return 'NO_ENCONTRADO';
    case HttpStatus.CONFLICT:
      return 'CONFLICTO';
    default:
      return 'ERROR';
  }
}
