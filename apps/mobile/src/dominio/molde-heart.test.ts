import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeHeart } from './molde-heart';

describe('molde de HEART score', () => {
  it('declara los cinco criterios, en orden', () => {
    const m = moldeHeart();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'historia',
      'ecg',
      'edad',
      'factoresRiesgo',
      'troponina',
    ]);
  });

  it('el máximo declarado es 10 y coincide con lo que suman los campos', () => {
    const m = moldeHeart();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(10);
    expect(puntajeMaximo(m.campos)).toBe(10);
  });

  it('el peor escenario suma 10', () => {
    const m = moldeHeart();
    const b = { historia: '2', ecg: '2', edad: '2', factoresRiesgo: '2', troponina: '2' };
    expect(puntajeParcial(m.campos, b)).toBe(10);
  });

  it('los cortes son 0-3 bajo, 4-6 moderado, 7-10 alto', () => {
    const m = moldeHeart();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 3)?.rotulo).toContain('bajo');
    expect(tramoDe(tramos, 6)?.rotulo).toContain('moderado');
    expect(tramoDe(tramos, 10)?.rotulo).toContain('alto');
  });
});
