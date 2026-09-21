import { puntajeMaximo, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeSofa } from './molde-sofa';

describe('molde de SOFA', () => {
  it('declara los seis sistemas', () => {
    const m = moldeSofa();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'respiratorio',
      'coagulacion',
      'hepatico',
      'cardiovascular',
      'neurologico',
      'renal',
    ]);
  });

  it('el máximo declarado es 24 y coincide con lo que suman los campos', () => {
    const m = moldeSofa();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(24);
    expect(puntajeMaximo(m.campos)).toBe(24);
  });

  it('cardiovascular tiene una opción "no aplica" que suma 0', () => {
    const m = moldeSofa();
    const cv = m.campos.find((c) => c.clave === 'cardiovascular');
    if (cv?.tipo !== 'opcion') throw new Error('debería ser opcion');
    expect(cv.opciones.find((o) => o.valor === 'na')?.puntos).toBe(0);
  });

  it('neurológico usa las bandas de Glasgow como opciones directas', () => {
    const m = moldeSofa();
    const neuro = m.campos.find((c) => c.clave === 'neurologico');
    if (neuro?.tipo !== 'opcion') throw new Error('debería ser opcion');
    expect(neuro.opciones.map((o) => o.etiqueta)).toEqual([
      'Glasgow 15',
      'Glasgow 13 – 14',
      'Glasgow 10 – 12',
      'Glasgow 6 – 9',
      'Glasgow < 6',
    ]);
  });

  it('respiratorio, coagulación, hepático y renal llevan valor exacto opcional; cardiovascular y neurológico no', () => {
    const m = moldeSofa();
    const conValorExacto = m.campos.filter((c) => c.tipo === 'opcion' && c.valorExacto).map((c) => c.clave);
    expect(conValorExacto).toEqual(['respiratorio', 'coagulacion', 'hepatico', 'renal']);
  });

  it('un solo tramo cubre todo el rango, sin fingir una categoría', () => {
    const m = moldeSofa();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    expect(m.resultado.tramos).toHaveLength(1);
    expect(tramoDe(m.resultado.tramos, 0)?.color).toBe('neutro');
    expect(tramoDe(m.resultado.tramos, 24)?.color).toBe('neutro');
  });
});
