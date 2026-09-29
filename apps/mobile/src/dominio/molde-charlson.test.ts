import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeCharlson } from './molde-charlson';

describe('molde del Índice de Comorbilidad de Charlson', () => {
  it('declara los diecinueve criterios en dieciséis campos (hepática, diabetes y tumor agrupan severidad en un solo campo de 3 opciones)', () => {
    const m = moldeCharlson();
    expect(m.campos).toHaveLength(16);
  });

  it('el máximo declarado es 33 y coincide con lo que suman los campos', () => {
    const m = moldeCharlson();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(33);
    expect(puntajeMaximo(m.campos)).toBe(33);
  });

  it('tumor sólido metastásico pesa 6, más que localizado (2)', () => {
    const m = moldeCharlson();
    const tumor = m.campos.find((c) => c.clave === 'tumorSolido');
    if (tumor?.tipo !== 'opcion') throw new Error('debería ser opcion');
    expect(tumor.opciones.find((o) => o.valor === 'localizado')?.puntos).toBe(2);
    expect(tumor.opciones.find((o) => o.valor === 'metastasico')?.puntos).toBe(6);
  });

  it('sin nada marcado (todo en la opción de menor peso) suma 0', () => {
    const m = moldeCharlson();
    const b = Object.fromEntries(
      m.campos.map((c) => {
        if (c.tipo !== 'opcion') throw new Error('todos deberían ser opcion');
        const cero = c.opciones.find((o) => o.puntos === 0 || o.puntos === undefined);
        return [c.clave, cero?.valor ?? 'no'];
      }),
    );
    expect(puntajeParcial(m.campos, b)).toBe(0);
  });

  it('los cortes son 0 sin comorbilidad, 1-2 baja, 3-4 moderada, 5+ alta', () => {
    const m = moldeCharlson();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 0)?.rotulo).toContain('Sin comorbilidad');
    expect(tramoDe(tramos, 2)?.rotulo).toContain('baja');
    expect(tramoDe(tramos, 4)?.rotulo).toContain('moderada');
    expect(tramoDe(tramos, 33)?.rotulo).toContain('alta');
  });
});
