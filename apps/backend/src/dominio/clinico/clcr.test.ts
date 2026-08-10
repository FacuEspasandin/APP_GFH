import { describe, expect, it } from 'vitest';

import { calcularClcr, DatoClinicoInvalido, edadEnAnios } from './clcr';

const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));

describe('Cockcroft-Gault (motor §4.1)', () => {
  it('calcula el caso del documento: varón 30 años, 80 kg, creatinina 0,9 → 135,8', () => {
    // Motor §4.4 usa este caso para justificar la regla del Clcr alto.
    expect(calcularClcr({ edadAnios: 30, pesoKg: 80, creatininaMgDl: 0.9, sexo: 'M' })).toBe(135.8);
  });

  it('aplica el factor 0.85 solo a sexo F', () => {
    const base = { edadAnios: 30, pesoKg: 80, creatininaMgDl: 0.9 } as const;
    const varon = calcularClcr({ ...base, sexo: 'M' });
    const mujer = calcularClcr({ ...base, sexo: 'F' });
    expect(mujer).toBeCloseTo(varon * 0.85, 0);
  });

  it('sexo OTRO usa factor 1.0, igual que M', () => {
    const base = { edadAnios: 30, pesoKg: 80, creatininaMgDl: 0.9 } as const;
    expect(calcularClcr({ ...base, sexo: 'OTRO' })).toBe(calcularClcr({ ...base, sexo: 'M' }));
  });

  it('redondea a 1 decimal', () => {
    const r = calcularClcr({ edadAnios: 72, pesoKg: 63.5, creatininaMgDl: 1.4, sexo: 'F' });
    expect(r).toBe(Math.round(r * 10) / 10);
  });

  it('nunca devuelve negativo, aunque la edad supere 140', () => {
    // 120 es el máximo admitido, así que el numerador nunca llega a negativo
    // por esta vía; el clamp existe igual por si el límite se relaja.
    expect(calcularClcr({ edadAnios: 120, pesoKg: 50, creatininaMgDl: 1, sexo: 'M' })).toBeGreaterThanOrEqual(0);
  });

  describe('rechaza entradas fuera de rango en vez de calcular igual', () => {
    const valido = { edadAnios: 40, pesoKg: 70, creatininaMgDl: 1, sexo: 'M' } as const;

    it.each([
      ['edad negativa', { ...valido, edadAnios: -1 }],
      ['edad > 120', { ...valido, edadAnios: 121 }],
      ['peso > 500', { ...valido, pesoKg: 501 }],
      ['creatinina > 30', { ...valido, creatininaMgDl: 31 }],
      ['NaN', { ...valido, pesoKg: Number.NaN }],
    ])('%s', (_caso, entrada) => {
      expect(() => calcularClcr(entrada)).toThrow(DatoClinicoInvalido);
    });

    /**
     * Endurecimiento deliberado respecto del documento, que admite 0 en ambos.
     * Con creatinina 0 la fórmula divide por cero y devuelve Infinity; con peso
     * 0 devuelve 0, que caería en el peor tramo de la tabla como si fuera un
     * dato real. Ninguno de los dos existe en un paciente.
     */
    it('creatinina 0 se rechaza — daría Infinity', () => {
      expect(() => calcularClcr({ ...valido, creatininaMgDl: 0 })).toThrow(DatoClinicoInvalido);
    });

    it('peso 0 se rechaza — daría un Clcr de 0 indistinguible de un fallo renal', () => {
      expect(() => calcularClcr({ ...valido, pesoKg: 0 })).toThrow(DatoClinicoInvalido);
    });

    it('edad 0 sí se admite: un recién nacido es un dato válido', () => {
      expect(() => calcularClcr({ ...valido, edadAnios: 0 })).not.toThrow();
    });
  });
});

describe('edad en años cumplidos', () => {
  it('no cuenta el año si todavía no cumplió', () => {
    expect(edadEnAnios(utc(1960, 6, 15), utc(2026, 6, 14))).toBe(65);
    expect(edadEnAnios(utc(1960, 6, 15), utc(2026, 6, 15))).toBe(66);
  });

  it('el borde importa: el día antes de cumplir 65 todavía no es adulto mayor', () => {
    expect(edadEnAnios(utc(1961, 8, 10), utc(2026, 8, 9))).toBe(64);
    expect(edadEnAnios(utc(1961, 8, 10), utc(2026, 8, 10))).toBe(65);
  });
});
