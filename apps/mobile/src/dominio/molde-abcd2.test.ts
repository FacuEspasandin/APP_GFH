import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeAbcd2 } from './molde-abcd2';

describe('molde de ABCD2', () => {
  it('declara los cinco criterios, en orden', () => {
    const m = moldeAbcd2();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'edad',
      'presionArterial',
      'clinica',
      'duracion',
      'diabetes',
    ]);
  });

  it('el máximo declarado es 7 y coincide con lo que suman los campos', () => {
    const m = moldeAbcd2();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(7);
    expect(puntajeMaximo(m.campos)).toBe(7);
  });

  it('el peor escenario suma 7', () => {
    const m = moldeAbcd2();
    const b = {
      edad: 'si',
      presionArterial: 'si',
      clinica: 'debilidad',
      duracion: 'mayor60',
      diabetes: 'si',
    };
    expect(puntajeParcial(m.campos, b)).toBe(7);
  });

  it('los cortes son 0-3 bajo, 4-5 moderado, 6-7 alto', () => {
    const m = moldeAbcd2();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 3)?.rotulo).toContain('bajo');
    expect(tramoDe(tramos, 5)?.rotulo).toContain('moderado');
    expect(tramoDe(tramos, 7)?.rotulo).toContain('alto');
  });
});
