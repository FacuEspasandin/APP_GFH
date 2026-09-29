import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeCentor } from './molde-centor';

describe('molde de Centor (McIsaac)', () => {
  it('declara los cinco criterios, en orden', () => {
    const m = moldeCentor();
    expect(m.campos.map((c) => c.clave)).toEqual(['exudado', 'adenopatia', 'fiebre', 'sinTos', 'edad']);
  });

  it('el máximo declarado es 5 y coincide con lo que suman los campos', () => {
    const m = moldeCentor();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(5);
    expect(puntajeMaximo(m.campos)).toBe(5);
  });

  it('la edad de 45 años o más resta un punto', () => {
    const m = moldeCentor();
    const edad = m.campos.find((c) => c.clave === 'edad');
    if (edad?.tipo !== 'opcion') throw new Error('debería ser opcion');
    expect(edad.opciones.find((o) => o.valor === 'mayor45')?.puntos).toBe(-1);
  });

  it('los cuatro criterios en "no" con adulto da -1', () => {
    const m = moldeCentor();
    const b = { exudado: 'no', adenopatia: 'no', fiebre: 'no', sinTos: 'no', edad: 'mayor45' };
    expect(puntajeParcial(m.campos, b)).toBe(-1);
  });

  it('un puntaje negativo cae en el tramo de probabilidad baja', () => {
    const m = moldeCentor();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    expect(tramoDe(m.resultado.tramos, -1)?.rotulo).toContain('baja');
  });
});
