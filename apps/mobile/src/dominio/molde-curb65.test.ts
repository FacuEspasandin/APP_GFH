import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeCurb65 } from './molde-curb65';

describe('molde de CURB-65', () => {
  it('declara los cinco criterios, en orden', () => {
    const m = moldeCurb65();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'confusion',
      'urea',
      'frecuenciaRespiratoria',
      'presionArterial',
      'edad',
    ]);
  });

  it('el máximo declarado es 5 y coincide con lo que suman los campos', () => {
    const m = moldeCurb65();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(5);
    expect(puntajeMaximo(m.campos)).toBe(5);
  });

  it('el corte de riesgo es en 3: 0-1 bajo, 2 intermedio, 3-5 alto', () => {
    const m = moldeCurb65();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 0)?.rotulo).toContain('bajo');
    expect(tramoDe(tramos, 1)?.rotulo).toContain('bajo');
    expect(tramoDe(tramos, 2)?.rotulo).toContain('intermedio');
    expect(tramoDe(tramos, 3)?.rotulo).toContain('alto');
    expect(tramoDe(tramos, 5)?.rotulo).toContain('alto');
  });

  it('marcar todo "sí" suma 5', () => {
    const m = moldeCurb65();
    const b = {
      confusion: 'si',
      urea: 'si',
      frecuenciaRespiratoria: 'si',
      presionArterial: 'si',
      edad: 'si',
    };
    expect(puntajeParcial(m.campos, b)).toBe(5);
  });
});
