import { describe, expect, it } from 'vitest';

import { calcularSodioCorregidoParaMolde, moldeSodioCorregido } from './molde-sodio-corregido';

describe('molde de sodio corregido', () => {
  it('declara los dos valores, en orden', () => {
    const m = moldeSodioCorregido();
    expect(m.campos.map((c) => c.clave)).toEqual(['sodioMeqL', 'glucosaMgDl']);
  });

  it('sin todos los datos, no calcula', () => {
    const r = calcularSodioCorregidoParaMolde({ sodioMeqL: '128' }, {});
    expect(r.sodioCorregidoMeqL?.valor).toBeNull();
  });

  it('corregido = sodio + 1,6 × ((glucosa - 100) / 100)', () => {
    const r = calcularSodioCorregidoParaMolde({ sodioMeqL: '128', glucosaMgDl: '450' }, {});
    expect(r.sodioCorregidoMeqL?.valor).toBe(134);
  });

  it('con glucosa normal (100), el corregido es igual al medido', () => {
    const r = calcularSodioCorregidoParaMolde({ sodioMeqL: '138', glucosaMgDl: '100' }, {});
    expect(r.sodioCorregidoMeqL?.valor).toBe(138);
  });

  it('no clasifica riesgo: el resultado es de tipo cifras, sin tramos', () => {
    const m = moldeSodioCorregido();
    expect(m.resultado.tipo).toBe('cifras');
  });
});
