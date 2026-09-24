import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeWells } from './molde-wells';

describe('molde de Wells (TEP)', () => {
  it('declara los siete criterios, en orden', () => {
    const m = moldeWells();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'signosTvp',
      'diagnosticoAlternativo',
      'frecuenciaCardiaca',
      'inmovilizacion',
      'tvpTepPrevio',
      'hemoptisis',
      'cancerActivo',
    ]);
  });

  it('el máximo declarado es 12,5 y coincide con lo que suman los campos', () => {
    const m = moldeWells();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(12.5);
    expect(puntajeMaximo(m.campos)).toBe(12.5);
  });

  it('los pesos por criterio son 3, 3, 1.5, 1.5, 1.5, 1 y 1', () => {
    const m = moldeWells();
    const puntosDe = (clave: string) => {
      const c = m.campos.find((x) => x.clave === clave);
      if (c?.tipo !== 'opcion') throw new Error('debería ser opcion');
      return c.opciones.find((o) => o.valor === 'si')?.puntos;
    };
    expect(puntosDe('signosTvp')).toBe(3);
    expect(puntosDe('diagnosticoAlternativo')).toBe(3);
    expect(puntosDe('frecuenciaCardiaca')).toBe(1.5);
    expect(puntosDe('inmovilizacion')).toBe(1.5);
    expect(puntosDe('tvpTepPrevio')).toBe(1.5);
    expect(puntosDe('hemoptisis')).toBe(1);
    expect(puntosDe('cancerActivo')).toBe(1);
  });

  it('el corte de riesgo es en 3: hasta 1,5 bajo, hasta 6 moderado, hasta 12,5 alto', () => {
    const m = moldeWells();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 0)?.rotulo).toContain('baja');
    expect(tramoDe(tramos, 1.5)?.rotulo).toContain('baja');
    expect(tramoDe(tramos, 2)?.rotulo).toContain('moderada');
    expect(tramoDe(tramos, 6)?.rotulo).toContain('moderada');
    expect(tramoDe(tramos, 6.5)?.rotulo).toContain('alta');
    expect(tramoDe(tramos, 12.5)?.rotulo).toContain('alta');
  });

  it('marcar todo "sí" suma 12,5', () => {
    const m = moldeWells();
    const b = {
      signosTvp: 'si',
      diagnosticoAlternativo: 'si',
      frecuenciaCardiaca: 'si',
      inmovilizacion: 'si',
      tvpTepPrevio: 'si',
      hemoptisis: 'si',
      cancerActivo: 'si',
    };
    expect(puntajeParcial(m.campos, b)).toBe(12.5);
  });
});
