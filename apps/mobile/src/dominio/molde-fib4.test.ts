import { tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { calcularFib4ParaMolde, moldeFib4 } from './molde-fib4';

describe('molde de FIB-4', () => {
  it('declara los cuatro valores, en orden', () => {
    const m = moldeFib4();
    expect(m.campos.map((c) => c.clave)).toEqual(['edadAnios', 'astUI', 'altUI', 'plaquetasMiles']);
  });

  it('sin todos los datos, no calcula', () => {
    const r = calcularFib4ParaMolde({ edadAnios: '50' }, {});
    expect(r.valor?.valor).toBeNull();
  });

  it('FIB-4 = (edad × AST) / (plaquetas × √ALT)', () => {
    const r = calcularFib4ParaMolde(
      { edadAnios: '40', astUI: '50', altUI: '25', plaquetasMiles: '200' },
      {},
    );
    expect(r.valor?.valor).toBe(2);
  });

  it('los cortes son 1,45 y 3,25', () => {
    const m = moldeFib4();
    if (m.resultado.tipo !== 'anillo') throw new Error('debería ser anillo');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 1.45)?.rotulo).toContain('Baja');
    expect(tramoDe(tramos, 2)?.rotulo).toBe('Indeterminado');
    expect(tramoDe(tramos, 3.26)?.rotulo).toContain('Alta');
  });
});
