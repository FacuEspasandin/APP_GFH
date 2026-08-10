import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { FastifyReply } from 'fastify';

import type { RespuestaError } from './respuesta';

/**
 * Traduce los errores conocidos de Prisma a respuestas con sentido.
 *
 * Sin esto, chocar contra un `@@unique` sale como "Ocurrió un error
 * inesperado" y un 500 — que es mentira dos veces: no fue inesperado (la base
 * hizo exactamente lo que se le pidió) y no es culpa del servidor (el dato que
 * mandó el cliente ya existe).
 *
 * Vale para todo el backend: cualquier restricción que se agregue al schema
 * queda cubierta sin tocar el caso de uso.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class FiltroPrisma implements ExceptionFilter {
  private readonly logger = new Logger(FiltroPrisma.name);

  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<FastifyReply>();
    const { estado, codigo, mensaje } = this.traducir(error);

    // Se registra igual: que el cliente reciba un 409 legible no quita que
    // convenga ver en el log qué restricción se tocó.
    this.logger.warn(`Prisma ${error.code} → ${estado} ${codigo}: ${mensaje}`);

    void respuesta.status(estado).send({
      success: false,
      error: { code: codigo, message: mensaje },
    } satisfies RespuestaError);
  }

  private traducir(error: Prisma.PrismaClientKnownRequestError): {
    estado: number;
    codigo: string;
    mensaje: string;
  } {
    const modelo = error.meta?.['modelName'] as string | undefined;
    const campos = this.campos(error);

    switch (error.code) {
      // Violación de restricción única.
      case 'P2002':
        return {
          estado: HttpStatus.CONFLICT,
          codigo: 'YA_EXISTE',
          mensaje: this.mensajeDuplicado(modelo, campos),
        };

      // La fila que se quería actualizar o borrar no existe. Suele significar
      // que es de otro médico: el `where` lleva `medicoId` y no matcheó.
      case 'P2025':
        return {
          estado: HttpStatus.NOT_FOUND,
          codigo: 'NO_ENCONTRADO',
          mensaje: 'No se encontró el registro.',
        };

      // Clave foránea: se apunta a algo que no existe, o se borra algo que
      // todavía tiene dependientes.
      case 'P2003':
        return {
          estado: HttpStatus.CONFLICT,
          codigo: 'REFERENCIA_INVALIDA',
          mensaje: 'El dato referenciado no existe o todavía está en uso.',
        };

      // Valor más largo que la columna.
      case 'P2000':
        return {
          estado: HttpStatus.BAD_REQUEST,
          codigo: 'DATOS_INVALIDOS',
          mensaje: 'Alguno de los valores es demasiado largo.',
        };

      default:
        // Un código que no mapeamos sí es inesperado, y ahí el 500 corresponde.
        this.logger.error(`Código de Prisma sin traducir: ${error.code}`, error.stack);
        return {
          estado: HttpStatus.INTERNAL_SERVER_ERROR,
          codigo: 'ERROR_INTERNO',
          mensaje: 'Ocurrió un error inesperado.',
        };
    }
  }

  private campos(error: Prisma.PrismaClientKnownRequestError): string[] {
    const target = error.meta?.['target'];
    if (Array.isArray(target)) return target as string[];
    if (typeof target === 'string') return [target];
    return [];
  }

  /**
   * Mensaje concreto donde se puede. "Ya tenés un grupo con ese nombre" le dice
   * al médico qué cambiar; "violación de restricción única" no.
   */
  private mensajeDuplicado(modelo: string | undefined, campos: string[]): string {
    const tiene = (c: string) => campos.includes(c);

    if (modelo === 'Grupo' && tiene('nombre')) {
      return 'Ya tenés un grupo con ese nombre.';
    }
    if (modelo === 'Medico') {
      if (tiene('email')) return 'Ese email ya está en uso.';
      if (tiene('nombreUsuario')) return 'Ese nombre de usuario ya está en uso.';
      return 'Esa cuenta ya existe.';
    }
    if (modelo === 'CondicionPaciente') {
      return 'El paciente ya tiene esa condición cargada.';
    }
    if (modelo === 'PrincipioActivo' && tiene('nombreNormalizado')) {
      return 'Ya existe un principio activo con ese nombre.';
    }
    if (modelo === 'ProductoComercial') {
      return 'Ya existe un producto con ese nombre, laboratorio y presentación.';
    }

    const lista = campos.length > 0 ? ` (${campos.join(', ')})` : '';
    return `Ya existe un registro con esos datos${lista}.`;
  }
}
