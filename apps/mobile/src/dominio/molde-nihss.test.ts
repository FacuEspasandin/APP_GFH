import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';
import { describe, expect, it } from 'vitest';

import { moldeNihss } from './molde-nihss';

describe('molde de NIHSS', () => {
  it('declara los quince criterios, en orden', () => {
    const m = moldeNihss();
    expect(m.campos.map((c) => c.clave)).toEqual([
      'concienciaNivel',
      'concienciaPreguntas',
      'concienciaOrdenes',
      'mirada',
      'camposVisuales',
      'paresiaFacial',
      'motorBrazoIzquierdo',
      'motorBrazoDerecho',
      'motorPiernaIzquierda',
      'motorPiernaDerecha',
      'ataxia',
      'sensibilidad',
      'lenguaje',
      'disartria',
      'extincionInatencion',
    ]);
  });

  it('el máximo declarado es 42 y coincide con lo que suman los campos', () => {
    const m = moldeNihss();
    expect(m.resultado.tipo === 'puntaje' && m.resultado.maximo).toBe(42);
    expect(puntajeMaximo(m.campos)).toBe(42);
  });

  it('"no aplica" en motor y ataxia no suma', () => {
    const m = moldeNihss();
    for (const clave of ['motorBrazoIzquierdo', 'motorBrazoDerecho', 'motorPiernaIzquierda', 'motorPiernaDerecha', 'ataxia', 'disartria']) {
      const campo = m.campos.find((c) => c.clave === clave);
      if (campo?.tipo !== 'opcion') throw new Error('debería ser opcion');
      expect(campo.opciones.find((o) => o.valor === 'na')?.puntos).toBe(0);
    }
  });

  it('el corte de riesgo es en 3: 0-4 leve, 5-15 moderado, 16-42 severo', () => {
    const m = moldeNihss();
    if (m.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = m.resultado;
    expect(tramoDe(tramos, 0)?.rotulo).toContain('leve');
    expect(tramoDe(tramos, 4)?.rotulo).toContain('leve');
    expect(tramoDe(tramos, 5)?.rotulo).toContain('moderado');
    expect(tramoDe(tramos, 15)?.rotulo).toContain('moderado');
    expect(tramoDe(tramos, 16)?.rotulo).toContain('severo');
    expect(tramoDe(tramos, 42)?.rotulo).toContain('severo');
  });

  it('marcar el peor valor de cada ítem suma 42', () => {
    const m = moldeNihss();
    const b = {
      concienciaNivel: '3',
      concienciaPreguntas: '2',
      concienciaOrdenes: '2',
      mirada: '2',
      camposVisuales: '3',
      paresiaFacial: '3',
      motorBrazoIzquierdo: '4',
      motorBrazoDerecho: '4',
      motorPiernaIzquierda: '4',
      motorPiernaDerecha: '4',
      ataxia: '2',
      sensibilidad: '2',
      lenguaje: '3',
      disartria: '2',
      extincionInatencion: '2',
    };
    expect(puntajeParcial(m.campos, b)).toBe(42);
  });

  it('todo en 0 (o "no aplica" donde existe) suma 0, y con un solo criterio contestado ya no es "sin empezar"', () => {
    const m = moldeNihss();
    expect(puntajeParcial(m.campos, { concienciaNivel: '0' })).toBe(0);
  });
});
