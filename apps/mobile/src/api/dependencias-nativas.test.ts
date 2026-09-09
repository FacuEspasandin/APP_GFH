import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * El 9/9 `expo-notifications`, `expo-image-picker` y `expo-image-manipulator`
 * quedaron declarados con `^57.x` —muy por encima de lo que soporta Expo SDK
 * 54— porque se agregaron con `pnpm add` en vez de `npx expo install`. El
 * desfase de ABI contra `expo-modules-core` rompió el registro de TODOS los
 * módulos nativos en iOS y Android, incluso `expo-linking`, sin relación
 * directa con los tres paquetes mal versionados. `tsc` y el resto de los
 * tests no lo detectan: recién explota en el teléfono. Esto lee
 * `package.json` y `expo/bundledNativeModules.json` (la fuente de verdad del
 * SDK instalado) sin necesitar el emulador.
 */

const RAIZ = path.resolve(__dirname, '..', '..');
const MONOREPO = path.resolve(RAIZ, '..', '..');

function dirDePaquete(nombre: string): string | null {
  for (const base of [RAIZ, MONOREPO]) {
    const candidato = path.join(base, 'node_modules', nombre);
    if (existsSync(path.join(candidato, 'package.json'))) return candidato;
  }
  return null;
}

function version(dir: string): string {
  return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
}

function mayor(v: string): string {
  return v.replace(/^[~^]/, '').split('.')[0] ?? v;
}

describe('versiones de módulos nativos de Expo', () => {
  const pkg = JSON.parse(readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  const dependencias = pkg.dependencies as Record<string, string>;

  it('ningún paquete expo-* se declara con rango caret (^)', () => {
    const conCaret = Object.entries(dependencias)
      .filter(([nombre, rango]) => nombre.startsWith('expo-') && rango.startsWith('^'))
      .map(([nombre, rango]) => `${nombre}@${rango}`);

    expect(
      conCaret,
      'expo-* se instala con `npx expo install <paquete>` (rango ~, fijado al SDK), nunca `pnpm add`/`npm install` a mano.',
    ).toEqual([]);
  });

  it('lo instalado coincide en versión mayor con lo que pide el SDK de Expo', () => {
    const expoDir = dirDePaquete('expo');
    expect(expoDir, 'no se encontró el paquete "expo" instalado').not.toBeNull();

    const bundled = JSON.parse(
      readFileSync(path.join(expoDir!, 'bundledNativeModules.json'), 'utf8'),
    ) as Record<string, string>;

    const desalineados: string[] = [];
    for (const [nombre, rango] of Object.entries(dependencias)) {
      const esperado = bundled[nombre];
      if (!esperado) continue; // no es un módulo nativo que Expo empaquete para este SDK

      const dir = dirDePaquete(nombre);
      if (!dir) {
        desalineados.push(`${nombre}: no se pudo resolver la instalación`);
        continue;
      }

      const instalado = version(dir);
      if (mayor(instalado) !== mayor(esperado)) {
        desalineados.push(`${nombre}: declarado ${rango}, instalado ${instalado}, el SDK pide ${esperado}`);
      }
    }

    expect(desalineados).toEqual([]);
  });
});
