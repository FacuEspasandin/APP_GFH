import { describe, expect, it } from 'vitest';

import {
  decidirEntrada,
  detalleDeAcceso,
  rutaNuevoPaciente,
  type EstadoDelPlan,
} from './plan-gratis';

const plan = (p: Partial<EstadoDelPlan> = {}): EstadoDelPlan => ({
  vigente: false,
  pacientes: 0,
  limitePacientes: 1,
  puedeCrearPaciente: true,
  ...p,
});

describe('entrada al formulario de crear paciente', () => {
  it('con cupo, muestra el formulario', () => {
    expect(decidirEntrada(plan({ puedeCrearPaciente: true }), false)).toBe('formulario');
  });

  it('sin cupo, va al paywall ANTES de que se escriba nada', () => {
    // Dejar llenar doce campos para recién ahí pedir que pague es cobrarle el
    // trabajo dos veces: la segunda cuando vuelva a escribir todo.
    expect(decidirEntrada(plan({ puedeCrearPaciente: false }), false)).toBe('paywall');
  });

  it('mientras no se sabe, espera: aparecer y desaparecer es peor que tardar', () => {
    expect(decidirEntrada(undefined, false)).toBe('esperar');
  });

  it('si la consulta del plan falla, deja pasar', () => {
    // El backend aplica el límite igual. Trabar por un dato de facturación que
    // no llegó sería inventar un muro que quizá no existe.
    expect(decidirEntrada(undefined, true)).toBe('formulario');
  });

  it('la suscripción vigente nunca queda en paywall', () => {
    expect(decidirEntrada(plan({ vigente: true, pacientes: 40, puedeCrearPaciente: true }), false)).toBe(
      'formulario',
    );
  });
});

describe('el acceso desde la lista', () => {
  it('con el plan lleno lleva directo al paywall', () => {
    expect(rutaNuevoPaciente(plan({ puedeCrearPaciente: false }))).toBe('/paywall');
  });

  it('con cupo lleva al formulario', () => {
    expect(rutaNuevoPaciente(plan())).toBe('/crear-paciente');
  });

  it('sin saber todavía, no manda al paywall por las dudas', () => {
    expect(rutaNuevoPaciente(undefined)).toBe('/crear-paciente');
  });

  it('avisa antes de tocar, no después', () => {
    expect(detalleDeAcceso(plan({ puedeCrearPaciente: false }))).toBe('Incluido en la suscripción');
    expect(detalleDeAcceso(plan())).toBeUndefined();
    expect(detalleDeAcceso(undefined)).toBeUndefined();
  });
});
