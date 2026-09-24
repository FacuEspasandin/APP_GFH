import { tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { calcularMeldParaMolde, moldeMeld } from './molde-meld';

describe('molde de MELD-Na', () => {
  it('declara los cuatro valores, en orden', () => {
    const m = moldeMeld();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'bilirrubinaMgDl',
      'inr',
      'creatininaMgDl',
      'sodioMeqL',
    ]);
  });

  it('sin todos los datos, no calcula', () => {
    const r = calcularMeldParaMolde({ bilirrubinaMgDl: '2', inr: '1.5' }, {});
    expect(r.valor?.valor).toBeNull();
  });

  it('valores normales dan un MELD bajo, sin corrección por sodio (MELD base ≤ 11)', () => {
    // bili 1, inr 1, creat 1, sodio 140 → meld base = 6,43 → redondea a 6.
    // Base ≤ 11: no se aplica la corrección por sodio.
    const r = calcularMeldParaMolde(
      { bilirrubinaMgDl: '1', inr: '1', creatininaMgDl: '1', sodioMeqL: '140' },
      {},
    );
    expect(r.valor?.valor).toBe(6);
  });

  it('el piso es 6, aunque la fórmula dé menos', () => {
    const r = calcularMeldParaMolde(
      { bilirrubinaMgDl: '0.3', inr: '0.8', creatininaMgDl: '0.5', sodioMeqL: '140' },
      {},
    );
    expect(r.valor?.valor).toBe(6);
  });

  it('la creatinina se topea en 4 antes de calcular', () => {
    const conDiez = calcularMeldParaMolde(
      { bilirrubinaMgDl: '2', inr: '1.5', creatininaMgDl: '10', sodioMeqL: '137' },
      {},
    );
    const conCuatro = calcularMeldParaMolde(
      { bilirrubinaMgDl: '2', inr: '1.5', creatininaMgDl: '4', sodioMeqL: '137' },
      {},
    );
    expect(conDiez.valor?.valor).toBe(conCuatro.valor?.valor);
  });

  it('con MELD base > 11, un sodio bajo sube el resultado', () => {
    // bili 4, inr 2, creat 2 → meld base ≈ 3,78·ln4 + 11,2·ln2 + 9,57·ln2 + 6,43
    // ≈ 5,24 + 7,77 + 6,63 + 6,43 ≈ 26 → > 11, se corrige por sodio.
    const conSodioNormal = calcularMeldParaMolde(
      { bilirrubinaMgDl: '4', inr: '2', creatininaMgDl: '2', sodioMeqL: '137' },
      {},
    );
    const conSodioBajo = calcularMeldParaMolde(
      { bilirrubinaMgDl: '4', inr: '2', creatininaMgDl: '2', sodioMeqL: '125' },
      {},
    );
    expect(conSodioNormal.valor?.valor).not.toBeNull();
    expect(conSodioBajo.valor!.valor!).toBeGreaterThan(conSodioNormal.valor!.valor!);
  });

  it('el sodio se acota entre 125 y 137 antes de aplicar la corrección', () => {
    const conCienExtremo = calcularMeldParaMolde(
      { bilirrubinaMgDl: '4', inr: '2', creatininaMgDl: '2', sodioMeqL: '100' },
      {},
    );
    const conCientoVeinticinco = calcularMeldParaMolde(
      { bilirrubinaMgDl: '4', inr: '2', creatininaMgDl: '2', sodioMeqL: '125' },
      {},
    );
    expect(conCienExtremo.valor?.valor).toBe(conCientoVeinticinco.valor?.valor);
  });

  it('el techo final es 40', () => {
    const r = calcularMeldParaMolde(
      { bilirrubinaMgDl: '40', inr: '15', creatininaMgDl: '4', sodioMeqL: '110' },
      {},
    );
    expect(r.valor?.valor).toBeLessThanOrEqual(40);
  });

  it('el corte de riesgo es en 3: ≤9 bajo, 10-19 moderado, ≥20 alto', () => {
    const m = moldeMeld();
    if (m.resultado.tipo !== 'anillo') throw new Error('debería ser anillo');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 9)?.rotulo).toContain('bajo');
    expect(tramoDe(tramos, 19)?.rotulo).toContain('moderado');
    expect(tramoDe(tramos, 20)?.rotulo).toContain('alto');
    expect(tramoDe(tramos, 40)?.rotulo).toContain('alto');
  });
});
