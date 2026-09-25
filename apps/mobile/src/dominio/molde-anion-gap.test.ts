import { tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { calcularAnionGapParaMolde, moldeAnionGap } from './molde-anion-gap';

describe('molde de Anion Gap', () => {
  it('declara los tres valores, en orden', () => {
    const m = moldeAnionGap();
    expect(m.campos.map((c) => c.clave)).toEqual(['sodioMeqL', 'cloroMeqL', 'bicarbonatoMeqL']);
  });

  it('sin todos los datos, no calcula', () => {
    const r = calcularAnionGapParaMolde({ sodioMeqL: '140' }, {});
    expect(r.valor?.valor).toBeNull();
  });

  it('AG = Na - (Cl + HCO3)', () => {
    const r = calcularAnionGapParaMolde({ sodioMeqL: '140', cloroMeqL: '100', bicarbonatoMeqL: '18' }, {});
    expect(r.valor?.valor).toBe(22);
  });

  it('un caso normal da AG bajo el corte', () => {
    const r = calcularAnionGapParaMolde({ sodioMeqL: '140', cloroMeqL: '104', bicarbonatoMeqL: '26' }, {});
    expect(r.valor?.valor).toBe(10);
  });

  it('el corte es en 16: hasta 16 normal, más elevado', () => {
    const m = moldeAnionGap();
    if (m.resultado.tipo !== 'anillo') throw new Error('debería ser anillo');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 16)?.rotulo).toContain('Normal');
    expect(tramoDe(tramos, 17)?.rotulo).toContain('Elevado');
  });
});
