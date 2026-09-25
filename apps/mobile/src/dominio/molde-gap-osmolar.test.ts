import { tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { calcularGapOsmolarParaMolde, moldeGapOsmolar } from './molde-gap-osmolar';

describe('molde de gap osmolar', () => {
  it('declara los cuatro valores, en orden', () => {
    const m = moldeGapOsmolar();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'sodioMeqL',
      'glucosaMgDl',
      'ureaMgDl',
      'osmolaridadMedidaMOsmKg',
    ]);
  });

  it('sin todos los datos, no calcula', () => {
    const r = calcularGapOsmolarParaMolde({ sodioMeqL: '140' }, {});
    expect(r.valor?.valor).toBeNull();
  });

  it('osmolaridad calculada = 2×Na + Glucosa/18 + Urea/6, gap = medida - calculada', () => {
    // 2×140 + 90/18 + 28/6 = 280 + 5 + 4,67 = 289,67 ≈ 290. Gap = 330-290 = 40.
    const r = calcularGapOsmolarParaMolde(
      { sodioMeqL: '140', glucosaMgDl: '90', ureaMgDl: '28', osmolaridadMedidaMOsmKg: '330' },
      {},
    );
    expect(r.valor?.valor).toBe(40);
  });

  it('un caso normal da gap bajo el corte', () => {
    // Calculada ≈290, medida 295 → gap 5.
    const r = calcularGapOsmolarParaMolde(
      { sodioMeqL: '140', glucosaMgDl: '90', ureaMgDl: '28', osmolaridadMedidaMOsmKg: '295' },
      {},
    );
    expect(r.valor?.valor).toBe(5);
  });

  it('el corte es en 3: hasta 10 normal, hasta 20 indeterminado, más sugiere tóxico', () => {
    const m = moldeGapOsmolar();
    if (m.resultado.tipo !== 'anillo') throw new Error('debería ser anillo');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 10)?.rotulo).toContain('Normal');
    expect(tramoDe(tramos, 20)?.rotulo).toContain('Indeterminado');
    expect(tramoDe(tramos, 21)?.rotulo).toContain('tóxico');
  });
});
