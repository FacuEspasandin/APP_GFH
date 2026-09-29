import { tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { calcularMaddreyParaMolde, moldeMaddrey } from './molde-maddrey';

describe('molde de Maddrey', () => {
  it('declara los tres valores, en orden', () => {
    const m = moldeMaddrey();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'ptPacienteSegundos',
      'ptControlSegundos',
      'bilirrubinaMgDl',
    ]);
  });

  it('sin todos los datos, no calcula', () => {
    const r = calcularMaddreyParaMolde({ ptPacienteSegundos: '25' }, {});
    expect(r.valor?.valor).toBeNull();
  });

  it('DF = 4,6 × (PT paciente − PT control) + bilirrubina', () => {
    const r = calcularMaddreyParaMolde(
      { ptPacienteSegundos: '25', ptControlSegundos: '12', bilirrubinaMgDl: '5.2' },
      {},
    );
    expect(r.valor?.valor).toBe(65);
  });

  it('el corte de gravedad es 32', () => {
    const m = moldeMaddrey();
    if (m.resultado.tipo !== 'anillo') throw new Error('debería ser anillo');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 32)?.rotulo).toContain('No cumple');
    expect(tramoDe(tramos, 33)?.rotulo).toContain('grave');
  });
});
