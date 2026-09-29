import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

/**
 * Query params: llegan como `string | string[] | undefined` y la app no emite la
 * metadata que el `ValidationPipe` necesitaría para deducirlo. Sin esto,
 * `?q=a&q=b` entraba como arreglo a `normalizar()` y devolvía un 500, y
 * `?desde=abc` armaba un `skip: NaN` que Prisma rechazaba también con 500.
 * Un valor mal formado es un 400, no un error del servidor.
 */

const LARGO_MAXIMO_BUSQUEDA = 100;

/** Un texto opcional de búsqueda: una sola cadena, acotada. */
@Injectable()
export class TextoOpcionalPipe implements PipeTransform<unknown, string | undefined> {
  transform(valor: unknown): string | undefined {
    if (valor === undefined) return undefined;
    if (typeof valor !== 'string') {
      throw new BadRequestException('El texto de búsqueda no es válido.');
    }
    return valor.slice(0, LARGO_MAXIMO_BUSQUEDA);
  }
}

/** Un entero opcional mayor o igual a cero, de hasta 7 dígitos. */
@Injectable()
export class EnteroNoNegativoOpcionalPipe implements PipeTransform<unknown, number | undefined> {
  transform(valor: unknown): number | undefined {
    if (valor === undefined) return undefined;
    if (typeof valor !== 'string' || !/^\d{1,7}$/.test(valor)) {
      throw new BadRequestException('El parámetro tiene que ser un número entero, cero o mayor.');
    }
    return Number(valor);
  }
}
