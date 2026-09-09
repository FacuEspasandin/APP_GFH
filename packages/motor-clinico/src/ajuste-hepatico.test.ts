import { describe, expect, it } from 'vitest';

import { elegirRangoPorClase, type RangoChildPugh } from './ajuste-hepatico';

const rango = (over: Partial<RangoChildPugh> = {}): RangoChildPugh => ({
  id: 'r1',
  clase: 'A',
  textoRecomendacion: 'texto',
  tipo: 'PRECAUCION',
  ...over,
});

describe('elegirRangoPorClase', () => {
  it('devuelve la fila de la clase pedida', () => {
    const rangos = [rango({ id: 'a', clase: 'A' }), rango({ id: 'c', clase: 'C', tipo: 'CONTRAINDICADO' })];
    expect(elegirRangoPorClase(rangos, 'C')?.id).toBe('c');
  });

  it('null cuando no hay fila para esa clase — no se infiere de otra', () => {
    const rangos = [rango({ id: 'b', clase: 'B' }), rango({ id: 'c', clase: 'C' })];
    expect(elegirRangoPorClase(rangos, 'A')).toBeNull();
  });

  it('sin catálogo, siempre null', () => {
    expect(elegirRangoPorClase([], 'A')).toBeNull();
  });
});
