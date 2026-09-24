import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeCha2ds2Vasc } from './molde-cha2ds2-vasc';

describe('molde de CHA2DS2-VASc', () => {
  it('declara los siete criterios, en orden', () => {
    const m = moldeCha2ds2Vasc();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'icc',
      'hipertension',
      'edad',
      'diabetes',
      'acv',
      'vascular',
      'sexoFemenino',
    ]);
  });

  it('el máximo declarado es 9 y coincide con lo que suman los campos', () => {
    const m = moldeCha2ds2Vasc();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(9);
    expect(puntajeMaximo(m.campos)).toBe(9);
  });

  it('edad tiene tres bandas: <65 no suma, 65-74 suma 1, ≥75 suma 2', () => {
    const m = moldeCha2ds2Vasc();
    const edad = m.campos.find((c) => c.clave === 'edad');
    if (edad?.tipo !== 'opcion') throw new Error('debería ser opcion');
    expect(edad.opciones.find((o) => o.valor === 'menor65')?.puntos).toBeUndefined();
    expect(edad.opciones.find((o) => o.valor === 'de65a74')?.puntos).toBe(1);
    expect(edad.opciones.find((o) => o.valor === 'mayor75')?.puntos).toBe(2);
  });

  it('ACV previo suma 2, no 1', () => {
    const m = moldeCha2ds2Vasc();
    const acv = m.campos.find((c) => c.clave === 'acv');
    if (acv?.tipo !== 'opcion') throw new Error('debería ser opcion');
    expect(acv.opciones.find((o) => o.valor === 'si')?.puntos).toBe(2);
  });

  it('el corte de riesgo es en 3: 0 bajo, 1 intermedio, 2-9 alto', () => {
    const m = moldeCha2ds2Vasc();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 0)?.rotulo).toContain('bajo');
    expect(tramoDe(tramos, 1)?.rotulo).toContain('intermedio');
    expect(tramoDe(tramos, 2)?.rotulo).toContain('alto');
    expect(tramoDe(tramos, 9)?.rotulo).toContain('alto');
  });

  it('marcar todo "sí" (más ≥75 en edad) suma 9', () => {
    const m = moldeCha2ds2Vasc();
    const b = {
      icc: 'si',
      hipertension: 'si',
      edad: 'mayor75',
      diabetes: 'si',
      acv: 'si',
      vascular: 'si',
      sexoFemenino: 'si',
    };
    // 1+1+2+1+2+1+1 = 9
    expect(puntajeParcial(m.campos, b)).toBe(9);
  });

  it('sólo el punto de sexo femenino suma 1, no queda en 0', () => {
    const m = moldeCha2ds2Vasc();
    const b = {
      icc: 'no',
      hipertension: 'no',
      edad: 'menor65',
      diabetes: 'no',
      acv: 'no',
      vascular: 'no',
      sexoFemenino: 'si',
    };
    expect(puntajeParcial(m.campos, b)).toBe(1);
  });
});
