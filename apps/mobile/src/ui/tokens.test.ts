import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PALETA, type Paleta } from './tokens';

/**
 * La paleta vive en dos lugares y tiene que decir lo mismo.
 *
 * `global.css` es lo que lee Tailwind para las clases; `tokens.ts` es lo que lee
 * JavaScript para los `style={{}}`. Duplicar valores siempre termina en deriva:
 * alguien cambia el verde de marca en uno, la mitad de la app queda del color
 * viejo, y no se nota hasta que alguien mira una pantalla puntual.
 *
 * Este test convierte esa deriva en un fallo de build.
 */

const CSS = readFileSync(join(__dirname, '..', '..', 'global.css'), 'utf8');

/** `--primary: 31 94 74;` → `#1F5E4A` */
function leerVariable(bloque: string, nombre: string): string | null {
  const m = bloque.match(new RegExp(`--${nombre}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`));
  if (!m) return null;
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(m[1]!)}${hex(m[2]!)}${hex(m[3]!)}`.toUpperCase();
}

/** El CSS define claro en `:root` y oscuro en `.dark:root`. */
function bloque(tema: 'claro' | 'oscuro'): string {
  const desde = CSS.indexOf(tema === 'claro' ? ':root {' : '.dark:root {');
  const hasta = CSS.indexOf('}', desde);
  return CSS.slice(desde, hasta);
}

/** camelCase de la interfaz → kebab-case de la variable CSS. */
const VARIABLE: Record<keyof Paleta, string> = {
  ink: 'ink',
  inkSuave: 'ink-suave',
  tenue: 'tenue',
  paper: 'paper',
  line: 'line',
  surface: 'surface',
  primary: 'primary',
  primaryHover: 'primary-hover',
  primaryLight: 'primary-light',
  accent: 'accent',
  accentLight: 'accent-light',
  peligro: 'peligro',
};

describe('paleta', () => {
  for (const tema of ['claro', 'oscuro'] as const) {
    describe(tema, () => {
      const css = bloque(tema);

      for (const [clave, variable] of Object.entries(VARIABLE) as [keyof Paleta, string][]) {
        it(`${clave} coincide con --${variable}`, () => {
          const enCss = leerVariable(css, variable);
          expect(enCss, `falta --${variable} en el bloque ${tema} de global.css`).not.toBeNull();
          expect(PALETA[tema][clave].toUpperCase()).toBe(enCss);
        });
      }
    });
  }

  it('los dos temas definen exactamente las mismas claves', () => {
    expect(Object.keys(PALETA.claro).sort()).toEqual(Object.keys(PALETA.oscuro).sort());
  });

  it('ningún color se repite entre ink y paper: el texto tiene que verse', () => {
    for (const tema of ['claro', 'oscuro'] as const) {
      expect(PALETA[tema].ink).not.toBe(PALETA[tema].paper);
      expect(PALETA[tema].ink).not.toBe(PALETA[tema].surface);
    }
  });
});
