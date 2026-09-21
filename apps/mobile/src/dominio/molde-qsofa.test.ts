import { puntajeMaximo, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeQsofa } from './molde-qsofa';

describe('molde de qSOFA', () => {
  it('declara los tres criterios', () => {
    const m = moldeQsofa();
    expect(m.campos.map((c) => c.clave)).toEqual(['frecuenciaRespiratoria', 'sensorio', 'presionArterial']);
  });

  it('el máximo es 3', () => {
    const m = moldeQsofa();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(3);
    expect(puntajeMaximo(m.campos)).toBe(3);
  });

  it('el corte de mayor riesgo es en 2', () => {
    const m = moldeQsofa();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 1)?.rotulo).toBe('Bajo riesgo');
    expect(tramoDe(tramos, 2)?.rotulo).toContain('Mayor riesgo');
    expect(tramoDe(tramos, 3)?.rotulo).toContain('Mayor riesgo');
  });
});
