import { describe, expect, it } from 'vitest';

import {
  cuerpoDeGuardado,
  estadoEmbarazo,
  estadoLactancia,
  etiquetaEmbarazo,
  nombreTrimestre,
  semanaValida,
  sePuedeGuardar,
  trimestre,
  valorLactancia,
} from './gestacion';

describe('lactancia: tres estados de verdad', () => {
  it('null no es false: uno es "no sé", el otro es "no"', () => {
    expect(estadoLactancia(null)).toBe('sin-dato');
    expect(estadoLactancia(undefined)).toBe('sin-dato');
    expect(estadoLactancia(false)).toBe('no');
    expect(estadoLactancia(true)).toBe('si');
  });

  it('la vuelta conserva la distinción', () => {
    expect(valorLactancia('sin-dato')).toBeNull();
    expect(valorLactancia('no')).toBe(false);
    expect(valorLactancia('si')).toBe(true);
  });

  it('sólo "sí" hace que el motor derive LACTANCIA', () => {
    // El motor evalúa `estaLactando === true`. Ni null ni false disparan nada,
    // pero se guardan distinto porque significan cosas distintas.
    expect(valorLactancia('si')).toBe(true);
    expect(valorLactancia('no')).not.toBe(true);
    expect(valorLactancia('sin-dato')).not.toBe(true);
  });
});

describe('embarazo: sólo dos estados representables', () => {
  it('sin semana es "sin dato"', () => {
    expect(estadoEmbarazo(null)).toBe('sin-dato');
    expect(estadoEmbarazo(undefined)).toBe('sin-dato');
  });

  it('con semana es "sí"', () => {
    expect(estadoEmbarazo(24)).toBe('si');
    expect(estadoEmbarazo(1)).toBe('si');
  });
});

describe('semana de gestación', () => {
  it('respeta los límites del backend', () => {
    expect(semanaValida(1)).toBe(true);
    expect(semanaValida(45)).toBe(true);
    expect(semanaValida(0)).toBe(false);
    expect(semanaValida(46)).toBe(false);
  });

  it('no acepta decimales ni vacío', () => {
    expect(semanaValida(12.5)).toBe(false);
    expect(semanaValida(undefined)).toBe(false);
  });
});

describe('trimestre', () => {
  it('sigue los cortes obstétricos estándar', () => {
    expect(trimestre(1)).toBe(1);
    expect(trimestre(13)).toBe(1);
    expect(trimestre(14)).toBe(2);
    expect(trimestre(27)).toBe(2);
    expect(trimestre(28)).toBe(3);
    expect(trimestre(40)).toBe(3);
  });

  it('se muestra con nombre', () => {
    expect(nombreTrimestre(24)).toBe('Segundo trimestre');
    expect(nombreTrimestre(8)).toBe('Primer trimestre');
    expect(nombreTrimestre(35)).toBe('Tercer trimestre');
  });
});

describe('el chip del cockpit', () => {
  it('lleva la semana cuando existe', () => {
    expect(etiquetaEmbarazo(24)).toBe('Embarazo · 24 sem');
  });

  it('sin semana no inventa una', () => {
    // Pasa cuando el médico cargó EMBARAZO como condición a mano.
    expect(etiquetaEmbarazo(null)).toBe('Embarazo');
  });
});

describe('lo que se manda al guardar', () => {
  it('con embarazo y semana válida manda la semana', () => {
    expect(cuerpoDeGuardado('si', 24, 'no')).toEqual({
      semanaGestacion: 24,
      estaLactando: false,
    });
  });

  it('«sin dato» manda null y NO omite el campo', () => {
    // Omitirlo dejaría el valor viejo: elegir "sin dato" tiene que limpiar.
    const cuerpo = cuerpoDeGuardado('sin-dato', 24, 'sin-dato');
    expect(cuerpo.semanaGestacion).toBeNull();
    expect(cuerpo.estaLactando).toBeNull();
    expect('semanaGestacion' in cuerpo).toBe(true);
    expect('estaLactando' in cuerpo).toBe(true);
  });

  it('una semana fuera de rango no viaja', () => {
    expect(cuerpoDeGuardado('si', 60, 'no').semanaGestacion).toBeNull();
  });

  it('los dos datos son independientes', () => {
    expect(cuerpoDeGuardado('sin-dato', undefined, 'si')).toEqual({
      semanaGestacion: null,
      estaLactando: true,
    });
  });
});

describe('cuándo se puede guardar', () => {
  it('con embarazo marcado hace falta una semana válida', () => {
    expect(sePuedeGuardar('si', undefined)).toBe(false);
    expect(sePuedeGuardar('si', 60)).toBe(false);
    expect(sePuedeGuardar('si', 24)).toBe(true);
  });

  it('sin dato se puede guardar siempre: es cómo se limpia', () => {
    expect(sePuedeGuardar('sin-dato', undefined)).toBe(true);
  });
});
