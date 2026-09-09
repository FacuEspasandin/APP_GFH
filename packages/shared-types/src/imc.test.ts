import { describe, expect, it } from 'vitest';

import { calcularImc } from './imc';
import { DatoClinicoInvalido } from './clcr';

describe('IMC (OMS)', () => {
  it('78 kg, 172 cm → 26,4 (sobrepeso)', () => {
    expect(calcularImc(78, 172)).toBe(26.4);
  });

  it('70 kg, 175 cm → 22,9 (normal)', () => {
    expect(calcularImc(70, 175)).toBe(22.9);
  });

  it('redondea a 1 decimal', () => {
    const r = calcularImc(83, 168);
    expect(r).toBe(Math.round(r * 10) / 10);
  });

  it.each([
    ['peso 0', 0, 170],
    ['peso > 500', 501, 170],
    ['talla < 20 cm', 70, 19],
    ['talla > 260 cm', 70, 261],
    ['NaN', Number.NaN, 170],
  ])('rechaza %s', (_caso, peso, talla) => {
    expect(() => calcularImc(peso, talla)).toThrow(DatoClinicoInvalido);
  });
});
