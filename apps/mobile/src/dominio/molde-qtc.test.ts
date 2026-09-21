import { describe, expect, it } from 'vitest';

import { calcularQtcParaMolde, claveTramoQtc, moldeQtc } from './molde-qtc';

describe('molde de QTc', () => {
  it('declara QT, frecuencia cardíaca y sexo', () => {
    const m = moldeQtc();
    expect(m.campos.map((c) => c.clave)).toEqual(['qtMs', 'fcLpm', 'sexo']);
  });

  it('el resultado son dos cifras, Bazett y Fridericia, sin tramos propios', () => {
    const m = moldeQtc();
    expect(m.resultado.tipo).toBe('cifras');
    if (m.resultado.tipo !== 'cifras') throw new Error('debería ser cifras');
    expect(m.resultado.cifras.map((c) => c.clave)).toEqual(['bazettMs', 'fridericiaMs']);
  });
});

describe('calcularQtcParaMolde', () => {
  it('a FC 60 (RR=1s), Bazett y Fridericia coinciden con el QT medido', () => {
    const r = calcularQtcParaMolde({ qtMs: '400', fcLpm: '60' }, {});
    expect(r.bazettMs?.valor).toBe(400);
    expect(r.fridericiaMs?.valor).toBe(400);
  });

  it('a FC 100, Bazett sobrecorrige más que Fridericia', () => {
    const r = calcularQtcParaMolde({ qtMs: '400', fcLpm: '100' }, {});
    expect(r.bazettMs?.valor).toBe(516);
    expect(r.fridericiaMs?.valor).toBe(474);
    expect(r.bazettMs!.valor!).toBeGreaterThan(r.fridericiaMs!.valor!);
  });

  it('sin todos los datos, valor null y no un error', () => {
    expect(calcularQtcParaMolde({ qtMs: '400' }, {}).bazettMs?.valor).toBeNull();
    expect(calcularQtcParaMolde({}, {}).bazettMs?.valor).toBeNull();
  });
});

describe('claveTramoQtc', () => {
  it('clasifica distinto por sexo: el corte de hombre es más bajo', () => {
    expect(claveTramoQtc(440, 'M')?.rotulo).toBe('Límite');
    expect(claveTramoQtc(440, 'F')?.rotulo).toBe('Normal');
  });

  it('por encima de 500, riesgo alto sin importar el sexo', () => {
    expect(claveTramoQtc(510, 'M')?.color).toBe('grave');
    expect(claveTramoQtc(510, 'F')?.color).toBe('grave');
    expect(claveTramoQtc(510, 'M')?.rotulo).toContain('Riesgo alto');
  });

  it('sin corte publicado para sexo OTRO, queda neutro en vez de inventar', () => {
    expect(claveTramoQtc(440, 'OTRO')?.color).toBe('neutro');
  });

  it('sin valor, no hay tramo', () => {
    expect(claveTramoQtc(null, 'M')).toBeNull();
  });
});
