import { describe, expect, it } from 'vitest';

import { DatoClinicoInvalido } from './clcr';
import { calcularEag } from './hba1c';

describe('HbA1c → eAG (estudio ADAG)', () => {
  it('HbA1c 7% → eAG 154 mg/dl, 8,5 mmol/l', () => {
    expect(calcularEag(7)).toEqual({ mgDl: 154, mmolL: 8.5 });
  });

  it('HbA1c 5,7% (borde de prediabetes) → eAG 117 mg/dl', () => {
    expect(calcularEag(5.7).mgDl).toBe(117);
  });

  it('HbA1c 6,5% (borde de diabetes) → eAG 140 mg/dl', () => {
    expect(calcularEag(6.5).mgDl).toBe(140);
  });

  it('mmol/l redondea a 1 decimal, mg/dl a entero', () => {
    const r = calcularEag(9.2);
    expect(r.mgDl).toBe(Math.round(r.mgDl));
    expect(r.mmolL).toBe(Math.round(r.mmolL * 10) / 10);
  });

  it.each([
    ['menor al mínimo validado', 2.9],
    ['mayor al máximo validado', 20.1],
    ['NaN', Number.NaN],
  ])('rechaza %s', (_caso, valor) => {
    expect(() => calcularEag(valor)).toThrow(DatoClinicoInvalido);
  });
});
