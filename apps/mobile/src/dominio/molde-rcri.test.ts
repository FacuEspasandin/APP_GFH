import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeRcri } from './molde-rcri';

describe('molde del Índice de Riesgo Cardíaco Revisado', () => {
  it('declara los seis criterios, en orden', () => {
    const m = moldeRcri();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'cirugiaAltoRiesgo',
      'cardiopatiaIsquemica',
      'insuficienciaCardiaca',
      'enfermedadCerebrovascular',
      'diabetesInsulina',
      'creatininaElevada',
    ]);
  });

  it('el máximo declarado es 6 y coincide con lo que suman los campos', () => {
    const m = moldeRcri();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(6);
    expect(puntajeMaximo(m.campos)).toBe(6);
  });

  it('marcar todo "sí" suma 6', () => {
    const m = moldeRcri();
    const b = Object.fromEntries(m.campos.map((c) => [c.clave, 'si']));
    expect(puntajeParcial(m.campos, b)).toBe(6);
  });

  it('las cuatro clases son I(0), II(1), III(2), IV(3+)', () => {
    const m = moldeRcri();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 0)?.rotulo).toContain('Clase I');
    expect(tramoDe(tramos, 1)?.rotulo).toContain('Clase II');
    expect(tramoDe(tramos, 2)?.rotulo).toContain('Clase III');
    expect(tramoDe(tramos, 6)?.rotulo).toContain('Clase IV');
  });
});
