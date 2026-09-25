import { describe, expect, it } from 'vitest';

import { calcularCalcioCorregidoParaMolde, moldeCalcioCorregido } from './molde-calcio-corregido';

describe('molde de calcio corregido', () => {
  it('declara los dos valores, en orden', () => {
    const m = moldeCalcioCorregido();
    expect(m.campos.map((c) => c.clave)).toEqual(['calcioMgDl', 'albuminaGDl']);
  });

  it('sin todos los datos, no calcula', () => {
    const r = calcularCalcioCorregidoParaMolde({ calcioMgDl: '7.8' }, {});
    expect(r.calcioCorregidoMgDl?.valor).toBeNull();
  });

  it('corregido = calcio + 0,8 × (4 - albúmina)', () => {
    const r = calcularCalcioCorregidoParaMolde({ calcioMgDl: '7.8', albuminaGDl: '2.5' }, {});
    expect(r.calcioCorregidoMgDl?.valor).toBeCloseTo(9.0, 1);
  });

  it('con albúmina normal (4 g/dL), el corregido es igual al medido', () => {
    const r = calcularCalcioCorregidoParaMolde({ calcioMgDl: '8.5', albuminaGDl: '4' }, {});
    expect(r.calcioCorregidoMgDl?.valor).toBe(8.5);
  });

  it('no clasifica riesgo: el resultado es de tipo cifras, sin tramos', () => {
    const m = moldeCalcioCorregido();
    expect(m.resultado.tipo).toBe('cifras');
  });
});
