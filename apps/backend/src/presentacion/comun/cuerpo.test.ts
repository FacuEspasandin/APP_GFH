import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guardia contra la regresión que ya pasó una vez.
 *
 * Un `@Body()` pelado no rompe nada visible: compila, responde 201 y no
 * valida. Nadie lo nota hasta que entra un dato malo. Por eso el chequeo es
 * estático — el único momento en que se puede detectar es antes de correr.
 *
 * La excepción es el webhook de RevenueCat, que recibe un cuerpo ajeno y no
 * debe rechazar campos que no declaramos.
 */

const CARPETA = join(__dirname, '..');
const EXCEPCIONES = new Set(['perfil.controller.ts']);

function controladores(): string[] {
  return readdirSync(CARPETA).filter((f) => f.endsWith('.controller.ts'));
}

describe('validación de cuerpos', () => {
  it('ningún controlador usa @Body() sin declarar el DTO', () => {
    const infractores: string[] = [];

    for (const archivo of controladores()) {
      if (EXCEPCIONES.has(archivo)) continue;

      const contenido = readFileSync(join(CARPETA, archivo), 'utf8');
      contenido.split('\n').forEach((linea, i) => {
        if (linea.includes('@Body()')) infractores.push(`${archivo}:${i + 1}`);
      });
    }

    expect(infractores, 'usá @Cuerpo(Dto) — ver comun/cuerpo.ts').toEqual([]);
  });

  it('el único @Body() permitido es el webhook de RevenueCat', () => {
    const perfil = readFileSync(join(CARPETA, 'perfil.controller.ts'), 'utf8');
    const cuantos = perfil.split('\n').filter((l) => l.includes('@Body()')).length;
    expect(cuantos).toBe(1);
  });

  it('hay controladores para revisar (si no, el test no prueba nada)', () => {
    expect(controladores().length).toBeGreaterThan(3);
  });
});
