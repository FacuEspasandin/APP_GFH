import { tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { calcularFenaParaMolde, moldeFena } from './molde-fena';

describe('molde de FENa', () => {
  it('declara los cuatro valores, en orden', () => {
    const m = moldeFena();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'sodioOrinaMeqL',
      'sodioMeqL',
      'creatininaOrinaMgDl',
      'creatininaMgDl',
    ]);
  });

  it('sin todos los datos, no calcula', () => {
    const r = calcularFenaParaMolde({ sodioOrinaMeqL: '15' }, {});
    expect(r.valor?.valor).toBeNull();
  });

  it('un caso prerenal típico da FENa bajo 1%', () => {
    // (15 × 1,8) / (138 × 60) × 100 = 27 / 8280 × 100 ≈ 0,33%
    const r = calcularFenaParaMolde(
      { sodioOrinaMeqL: '15', sodioMeqL: '138', creatininaOrinaMgDl: '60', creatininaMgDl: '1.8' },
      {},
    );
    expect(r.valor?.valor).toBeCloseTo(0.33, 1);
  });

  it('un caso de NTA típico da FENa sobre 2%', () => {
    // (60 × 1,8) / (140 × 20) × 100 = 108 / 2800 × 100 ≈ 3,86%
    const r = calcularFenaParaMolde(
      { sodioOrinaMeqL: '60', sodioMeqL: '140', creatininaOrinaMgDl: '20', creatininaMgDl: '1.8' },
      {},
    );
    expect(r.valor?.valor).toBeCloseTo(3.86, 1);
  });

  it('sodio en plasma o creatinina en orina en cero no divide por cero', () => {
    const r = calcularFenaParaMolde(
      { sodioOrinaMeqL: '15', sodioMeqL: '0', creatininaOrinaMgDl: '60', creatininaMgDl: '1.8' },
      {},
    );
    expect(r.valor?.valor).toBeNull();
    expect(r.valor?.porQueNo).toBeTruthy();
  });

  it('el corte es en 3: hasta 1% prerenal, hasta 2% indeterminado, más renal', () => {
    const m = moldeFena();
    if (m.resultado.tipo !== 'anillo') throw new Error('debería ser anillo');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 1)?.rotulo).toContain('prerenal');
    expect(tramoDe(tramos, 2)?.rotulo).toContain('indeterminada');
    expect(tramoDe(tramos, 10)?.rotulo).toContain('renal intrínseca');
  });
});
