import { describe, expect, it } from 'vitest';

import { esSintetica, nombreCondicion } from './condiciones';

describe('nombres de condiciones', () => {
  it('las siglas médicas se dejan como el médico las escribe', () => {
    expect(nombreCondicion('HTA')).toBe('HTA');
    expect(nombreCondicion('EPOC')).toBe('EPOC');
    expect(nombreCondicion('ERC')).toBe('ERC');
  });

  it('los códigos con nombre propio se traducen', () => {
    expect(nombreCondicion('ADULTO_MAYOR')).toBe('Adulto mayor');
    expect(nombreCondicion('ULCERA_PEPTICA')).toBe('Úlcera péptica');
  });

  it('un código desconocido queda legible, no en mayúsculas con guiones', () => {
    // Que un chip diga MI_CONDICION delata que se está pintando una fila de la
    // base y no un dato pensado para leerse.
    expect(nombreCondicion('MI_CONDICION_NUEVA')).toBe('Mi condicion nueva');
  });

  it('no inventa tildes en lo que no conoce', () => {
    expect(nombreCondicion('CIRROSIS_HEPATICA')).toBe('Cirrosis hepatica');
  });

  it('nunca devuelve vacío', () => {
    expect(nombreCondicion('X')).toBe('X');
  });
});

describe('condiciones sintéticas (motor §6.2)', () => {
  it('las tres que el motor deriva solo', () => {
    expect(esSintetica('ADULTO_MAYOR')).toBe(true);
    expect(esSintetica('EMBARAZO')).toBe(true);
    expect(esSintetica('LACTANCIA')).toBe(true);
  });

  it('las cargadas por el médico no lo son', () => {
    // Importa para la auditoría: distingue lo que alguien cargó de lo que el
    // motor dedujo de la edad o la semana de gestación.
    expect(esSintetica('HTA')).toBe(false);
    expect(esSintetica('ULCERA')).toBe(false);
  });
});
