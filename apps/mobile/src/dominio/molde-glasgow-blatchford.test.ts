import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeGlasgowBlatchford } from './molde-glasgow-blatchford';

describe('molde de Glasgow-Blatchford', () => {
  it('declara los ocho criterios, en orden', () => {
    const m = moldeGlasgowBlatchford();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'urea',
      'hemoglobina',
      'presionArterial',
      'frecuenciaCardiaca',
      'melena',
      'sincope',
      'hepatopatia',
      'insuficienciaCardiaca',
    ]);
  });

  it('el máximo declarado es 23 y coincide con lo que suman los campos', () => {
    const m = moldeGlasgowBlatchford();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(23);
    expect(puntajeMaximo(m.campos)).toBe(23);
  });

  it('todo en el mínimo suma 0', () => {
    const m = moldeGlasgowBlatchford();
    const b = {
      urea: '0',
      hemoglobina: 'h0',
      presionArterial: '0',
      frecuenciaCardiaca: 'no',
      melena: 'no',
      sincope: 'no',
      hepatopatia: 'no',
      insuficienciaCardiaca: 'no',
    };
    expect(puntajeParcial(m.campos, b)).toBe(0);
  });

  it('el peor escenario suma 23', () => {
    const m = moldeGlasgowBlatchford();
    const b = {
      urea: '6',
      hemoglobina: '6',
      presionArterial: '3',
      frecuenciaCardiaca: 'si',
      melena: 'si',
      sincope: 'si',
      hepatopatia: 'si',
      insuficienciaCardiaca: 'si',
    };
    expect(puntajeParcial(m.campos, b)).toBe(23);
  });

  it('0 es alta segura; más de 0 es grave', () => {
    const m = moldeGlasgowBlatchford();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 0)?.rotulo).toContain('alta');
    expect(tramoDe(tramos, 1)?.rotulo).toContain('evaluar');
  });
});
