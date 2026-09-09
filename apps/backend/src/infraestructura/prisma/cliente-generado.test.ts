import { readFileSync } from 'node:fs';
import path from 'node:path';

import * as clientePrisma from '@prisma/client';
import { describe, expect, it } from 'vitest';

/**
 * El 9/9 el cliente de Prisma no estaba regenerado tras un cambio de schema
 * (push, historial, `HerramientaFicha`, etc.): faltaban enums y delegates
 * enteros. `tsc` lo detectó, pero como ~130 errores en cascada repartidos
 * por todo `src/`, indistinguibles a simple vista de errores de código real
 * — costó identificar que la causa era una sola (`prisma generate` sin
 * correr). Este test aísla exactamente esa causa: si falla SOLO este
 * archivo, el arreglo es `pnpm --filter @gfh/backend prisma:generate`, no
 * revisar código.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');

function declaracionesDe(tipo: 'model' | 'enum'): string[] {
  const schema = readFileSync(path.join(RAIZ, 'prisma', 'schema.prisma'), 'utf8');
  const patron = new RegExp(`^${tipo} (\\w+)`, 'gm');
  return [...schema.matchAll(patron)]
    .map((m) => m[1])
    .filter((nombre): nombre is string => nombre !== undefined);
}

function aCamelInicial(nombre: string): string {
  return nombre.charAt(0).toLowerCase() + nombre.slice(1);
}

describe('cliente de Prisma generado', () => {
  it('exporta todos los enums declarados en schema.prisma', () => {
    const faltantes = declaracionesDe('enum').filter(
      (nombre) => !(nombre in (clientePrisma as Record<string, unknown>)),
    );

    expect(
      faltantes,
      'Correr `pnpm --filter @gfh/backend prisma:generate` — el cliente quedó desactualizado contra el schema.',
    ).toEqual([]);
  });

  it('expone un delegate por cada modelo declarado en schema.prisma', () => {
    const cliente = new clientePrisma.PrismaClient();
    try {
      const faltantes = declaracionesDe('model').filter(
        (nombre) => !(aCamelInicial(nombre) in cliente),
      );

      expect(
        faltantes,
        'Correr `pnpm --filter @gfh/backend prisma:generate` — el cliente quedó desactualizado contra el schema.',
      ).toEqual([]);
    } finally {
      // No conecta a la base solo por instanciarse ni por leer sus propias
      // propiedades — pero cierra el handle igual, prolijidad de test.
      void cliente.$disconnect();
    }
  });
});
