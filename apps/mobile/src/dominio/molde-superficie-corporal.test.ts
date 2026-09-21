import { describe, expect, it } from 'vitest';

import { calcularSuperficieCorporalParaMolde, moldeSuperficieCorporal } from './molde-superficie-corporal';

describe('molde de superficie corporal', () => {
  it('declara peso y talla, y una sola cifra sin tramos', () => {
    const m = moldeSuperficieCorporal();
    expect(m.campos.map((c) => c.clave)).toEqual(['pesoKg', 'tallaCm']);
    expect(m.resultado.tipo).toBe('cifras');
    if (m.resultado.tipo !== 'cifras') throw new Error('debería ser cifras');
    expect(m.resultado.cifras).toHaveLength(1);
  });
});

describe('calcularSuperficieCorporalParaMolde', () => {
  it('70 kg y 170 cm dan 1,82 m² (ejemplo del informe)', () => {
    const r = calcularSuperficieCorporalParaMolde({ pesoKg: '70', tallaCm: '170' }, {});
    expect(r.superficieM2?.valor).toBe(1.82);
  });

  it('acepta coma decimal', () => {
    const r = calcularSuperficieCorporalParaMolde({ pesoKg: '70,5', tallaCm: '170' }, {});
    expect(r.superficieM2?.valor).not.toBeNull();
  });

  it('sin todos los datos, valor null y no un error', () => {
    expect(calcularSuperficieCorporalParaMolde({ pesoKg: '70' }, {}).superficieM2?.valor).toBeNull();
    expect(calcularSuperficieCorporalParaMolde({}, {}).superficieM2?.valor).toBeNull();
  });
});
