// Las tools validan Dtos FUERA del bootstrap de Nest (que ya importa esto por
// su cuenta) — sin este import, `Reflect.getMetadata` no existe todavía y
// class-validator explota al decorar el Dto, no al validar una instancia.
import 'reflect-metadata';

import type { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Valida el input que mandó el modelo contra el MISMO Dto que valida el
 * endpoint HTTP equivalente (`Cuerpo()`), pero fuera del pipeline HTTP: las
 * tools llaman a los servicios directo, sin pasar por un controller.
 *
 * Sin esto, un input mal formado del modelo (un campo de más, un uuid mal
 * armado) explota como error crudo de Prisma en vez de volver como un
 * `tool_result` de error que el modelo puede leer y corregir solo.
 */
export async function validarEntradaTool<T extends object>(tipo: Type<T>, input: unknown): Promise<T> {
  const instancia = plainToInstance(tipo, input ?? {});
  const errores = await validate(instancia, { whitelist: true, forbidNonWhitelisted: true });

  if (errores.length > 0) {
    const detalle = errores
      .map((e) => Object.values(e.constraints ?? {}).join('; '))
      .filter(Boolean)
      .join(' | ');
    throw new Error(`Entrada inválida: ${detalle || 'revisá los campos mandados.'}`);
  }

  return instancia;
}
