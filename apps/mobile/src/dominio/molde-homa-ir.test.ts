import { describe, expect, it } from 'vitest';

import { calcularHomaIrParaMolde, moldeHomaIr } from './molde-homa-ir';

describe('molde de HOMA-IR', () => {
  it('declara los dos valores, en orden', () => {
    const m = moldeHomaIr();
    expect(m.campos.map((c) => c.clave)).toEqual(['glucosaMgDl', 'insulinaUUmL']);
  });

  it('sin todos los datos, no calcula', () => {
    const r = calcularHomaIrParaMolde({ glucosaMgDl: '95' }, {});
    expect(r.homaIr?.valor).toBeNull();
  });

  it('HOMA-IR = (glucosa × insulina) / 405', () => {
    const r = calcularHomaIrParaMolde({ glucosaMgDl: '95', insulinaUUmL: '18' }, {});
    expect(r.homaIr?.valor).toBeCloseTo(4.22, 2);
  });

  it('no clasifica riesgo: el resultado es de tipo cifras, sin tramos', () => {
    const m = moldeHomaIr();
    expect(m.resultado.tipo).toBe('cifras');
  });
});
