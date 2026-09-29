import { describe, expect, it } from 'vitest';

import { extraerDosis } from './foto.service';

describe('extraerDosis', () => {
  it('lee las dosis habituales', () => {
    expect(extraerDosis('Amoxicilina 500 mg cada 8 h')).toBe('500 mg');
    expect(extraerDosis('Levotiroxina 0,05 mg')).toBe('0,05 mg');
    expect(extraerDosis('Enalapril 2.5mg')).toBe('2.5 mg');
    expect(extraerDosis('Insulina 10 UI')).toBe('10 ui');
  });

  it('una combinación se lee entera, con la barra', () => {
    expect(extraerDosis('Bactrim 800/160 mg')).toBe('800/160 mg');
    expect(extraerDosis('Augmentin 875 / 125 mg')).toBe('875/125 mg');
  });

  it('sin unidad no inventa nada', () => {
    expect(extraerDosis('Warfarina cada 24 h')).toBeNull();
    expect(extraerDosis('')).toBeNull();
  });

  it('no arranca a leer en medio de un número', () => {
    // El "5" de "1500" no puede ser una dosis de 5 mg.
    expect(extraerDosis('lote 1500 x')).toBeNull();
  });
});

/**
 * ReDoS: la regex vieja probaba una cantidad cúbica de particiones sobre una
 * cadena de dígitos sin unidad — 3 s con 1.500, más de un minuto con 4.000 —
 * y bloqueaba el servidor entero. Estas entradas eran el ataque.
 */
describe('extraerDosis frente a entradas hostiles', () => {
  const tardaMenosDe = (ms: number, entrada: string) => {
    const t0 = performance.now();
    extraerDosis(entrada);
    return performance.now() - t0 < ms;
  };

  it('una cadena larga de dígitos sin unidad', () => {
    expect(tardaMenosDe(100, '1'.repeat(100_000) + 'x')).toBe(true);
  });

  it('una cadena larga de fracciones', () => {
    expect(tardaMenosDe(100, '1/'.repeat(50_000) + 'x')).toBe(true);
  });

  it('una cadena larga de decimales', () => {
    expect(tardaMenosDe(100, '1.'.repeat(50_000) + 'x')).toBe(true);
    expect(tardaMenosDe(100, '1,1 '.repeat(20_000) + 'x')).toBe(true);
  });

  it('dígitos y espacios alternados', () => {
    expect(tardaMenosDe(100, '1 '.repeat(50_000) + 'x')).toBe(true);
  });
});
