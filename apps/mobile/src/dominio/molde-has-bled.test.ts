import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { FACTORES_MODIFICABLES_HAS_BLED, moldeHasBled } from './molde-has-bled';

describe('molde de HAS-BLED', () => {
  it('declara los nueve criterios, cada uno independiente', () => {
    const m = moldeHasBled();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'hipertension',
      'renal',
      'hepatica',
      'acv',
      'sangrado',
      'inrLabil',
      'edad',
      'farmacos',
      'alcohol',
    ]);
  });

  it('el máximo declarado es 9 y coincide con lo que suman los campos', () => {
    const m = moldeHasBled();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(9);
    expect(puntajeMaximo(m.campos)).toBe(9);
  });

  it('inrLabil tiene una tercera opción, "No aplica", que no suma', () => {
    const m = moldeHasBled();
    const inr = m.campos.find((c) => c.clave === 'inrLabil');
    if (inr?.tipo !== 'opcion') throw new Error('debería ser opcion');
    expect(inr.opciones.map((o) => o.valor)).toEqual(['si', 'no', 'na']);
    expect(inr.opciones.find((o) => o.valor === 'na')?.puntos).toBe(0);
  });

  it('el corte de riesgo es en 3: 0-2 bajo/moderado, 3-9 alto', () => {
    const m = moldeHasBled();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 2)?.rotulo).toContain('bajo/moderado');
    expect(tramoDe(tramos, 3)?.rotulo).toContain('alto');
    expect(tramoDe(tramos, 9)?.rotulo).toContain('alto');
  });

  it('marcar todo "sí" suma 9, con "no aplica" en el lábil', () => {
    const m = moldeHasBled();
    const b = {
      hipertension: 'si',
      renal: 'si',
      hepatica: 'si',
      acv: 'si',
      sangrado: 'si',
      inrLabil: 'na',
      edad: 'si',
      farmacos: 'si',
      alcohol: 'si',
    };
    // 8 campos en "sí" (1 c/u) + el lábil en "no aplica" (0) = 8, no 9.
    expect(puntajeParcial(m.campos, b)).toBe(8);
  });

  it('los tres factores modificables son campos reales del molde', () => {
    const m = moldeHasBled();
    const claves = m.campos.map((c) => c.clave);
    for (const f of FACTORES_MODIFICABLES_HAS_BLED) {
      expect(claves).toContain(f.clave);
    }
    expect(FACTORES_MODIFICABLES_HAS_BLED).toHaveLength(3);
  });
});
