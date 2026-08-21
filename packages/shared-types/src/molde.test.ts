import { describe, expect, it } from 'vitest';

import {
  completo,
  contestado,
  cuantosContestados,
  puntajeMaximo,
  puntajeParcial,
  textoDeFaltantes,
  opcionesDe,
  rangoDe,
  tramoDe,
  unidadDe,
  type Campo,
  type CampoNumero,
  type CampoOpcion,
  type Tramo,
} from './molde';

/** Tres criterios de puntaje y uno numérico: la mezcla que se va a dar. */
const CAMPOS: readonly Campo[] = [
  {
    tipo: 'opcion',
    clave: 'icc',
    rotulo: 'Insuficiencia cardíaca',
    opciones: [
      { valor: 'no', etiqueta: 'No' },
      { valor: 'si', etiqueta: 'Sí', puntos: 1 },
    ],
  },
  {
    tipo: 'opcion',
    clave: 'edad',
    rotulo: 'Edad',
    opciones: [
      { valor: 'menor65', etiqueta: '< 65' },
      { valor: 'de65a74', etiqueta: '65 – 74', puntos: 1 },
      { valor: 'mayor75', etiqueta: '≥ 75', puntos: 2 },
    ],
  },
  {
    tipo: 'opcion',
    clave: 'acv',
    rotulo: 'ACV previo',
    opciones: [
      { valor: 'no', etiqueta: 'No' },
      { valor: 'si', etiqueta: 'Sí', puntos: 2 },
    ],
  },
];

const TRAMOS: readonly Tramo[] = [
  { hasta: 0, rotulo: 'Riesgo bajo', color: 'ok' },
  { hasta: 1, rotulo: 'Riesgo intermedio', color: 'ok' },
  { hasta: 9, rotulo: 'Riesgo alto', color: 'media' },
];

describe('contestado', () => {
  it('sin la clave, no', () => {
    expect(contestado({}, 'icc')).toBe(false);
  });

  it('vacío o sólo espacios tampoco: el campo tocado y borrado no cuenta', () => {
    expect(contestado({ icc: '' }, 'icc')).toBe(false);
    expect(contestado({ icc: '   ' }, 'icc')).toBe(false);
  });

  it('«no» sí cuenta: contestar que no es contestar', () => {
    expect(contestado({ icc: 'no' }, 'icc')).toBe(true);
  });

  it('«0» cuenta: es un valor, no un vacío', () => {
    expect(contestado({ peso: '0' }, 'peso')).toBe(true);
  });
});

describe('cuántos y completo', () => {
  it('cuenta los contestados', () => {
    expect(cuantosContestados(CAMPOS, { icc: 'si', edad: 'mayor75' })).toBe(2);
  });

  it('completo sólo con todos', () => {
    expect(completo(CAMPOS, { icc: 'si', edad: 'mayor75' })).toBe(false);
    expect(completo(CAMPOS, { icc: 'si', edad: 'mayor75', acv: 'no' })).toBe(true);
  });
});

describe('tramoDe', () => {
  it('el borde es inclusivo: 1 es intermedio, no alto', () => {
    expect(tramoDe(TRAMOS, 1)?.rotulo).toBe('Riesgo intermedio');
  });

  it('gana el primero que alcanza', () => {
    expect(tramoDe(TRAMOS, 0)?.rotulo).toBe('Riesgo bajo');
    expect(tramoDe(TRAMOS, 2)?.rotulo).toBe('Riesgo alto');
    expect(tramoDe(TRAMOS, 9)?.rotulo).toBe('Riesgo alto');
  });

  it('sin tramo que lo cubra devuelve null en vez de inventar el último', () => {
    expect(tramoDe(TRAMOS, 10)).toBeNull();
  });
});

describe('puntaje', () => {
  it('el parcial suma sólo lo contestado', () => {
    expect(puntajeParcial(CAMPOS, { icc: 'si', edad: 'mayor75' })).toBe(3);
  });

  it('una opción sin puntos suma cero, no rompe', () => {
    expect(puntajeParcial(CAMPOS, { icc: 'no', edad: 'menor65' })).toBe(0);
  });

  it('un valor que no está en las opciones no suma: dato viejo, no puntos inventados', () => {
    expect(puntajeParcial(CAMPOS, { icc: 'quizas' })).toBe(0);
  });

  it('el máximo sale de la declaración', () => {
    expect(puntajeMaximo(CAMPOS)).toBe(5);
  });

  it('el máximo toma la opción más alta de cada campo, no la suma de todas', () => {
    expect(puntajeMaximo([CAMPOS[1]!])).toBe(2);
  });
});

describe('textoDeFaltantes', () => {
  it('completo no dice nada', () => {
    expect(textoDeFaltantes(CAMPOS, { icc: 'no', edad: 'menor65', acv: 'no' })).toBeNull();
  });

  it('uno solo se nombra', () => {
    expect(textoDeFaltantes(CAMPOS, { icc: 'no', edad: 'menor65' })).toBe('falta acv previo');
  });

  it('dos se cuentan: nombrarlos a todos deja de leerse', () => {
    expect(textoDeFaltantes(CAMPOS, { icc: 'no' })).toBe('faltan 2 datos');
  });

  it('vacío del todo lo dice distinto: no empezó, no le falta el final', () => {
    expect(textoDeFaltantes(CAMPOS, {})).toBe('faltan los 3 datos');
  });
});

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

/** Bilirrubina: la misma banda escrita en dos escalas. Los `valor` coinciden. */
const BILIRRUBINA = {
  tipo: 'opcion',
  clave: 'bilirrubina',
  rotulo: 'Bilirrubina total',
  opciones: [
    { valor: 'baja', etiqueta: '< 2', puntos: 1 },
    { valor: 'media', etiqueta: '2 – 3', puntos: 2 },
    { valor: 'alta', etiqueta: '> 3', puntos: 3 },
  ],
  unidades: [
    {
      valor: 'mg/dL',
      etiqueta: 'mg/dL',
      opciones: [
        { valor: 'baja', etiqueta: '< 2', puntos: 1 },
        { valor: 'media', etiqueta: '2 – 3', puntos: 2 },
        { valor: 'alta', etiqueta: '> 3', puntos: 3 },
      ],
    },
    {
      valor: 'umol/L',
      etiqueta: 'µmol/L',
      opciones: [
        { valor: 'baja', etiqueta: '< 34', puntos: 1 },
        { valor: 'media', etiqueta: '34 – 50', puntos: 2 },
        { valor: 'alta', etiqueta: '> 50', puntos: 3 },
      ],
    },
  ],
} as const satisfies CampoOpcion;

const PESO = {
  tipo: 'numero',
  clave: 'peso',
  rotulo: 'Peso',
  unidad: 'kg',
  rango: { min: 1, max: 400, decimales: 1 },
  unidades: [
    { valor: 'kg', etiqueta: 'kg', rango: { min: 1, max: 400, decimales: 1 } },
    { valor: 'lb', etiqueta: 'lb', rango: { min: 2, max: 880, decimales: 1 } },
  ],
} as const satisfies CampoNumero;

describe('unidades', () => {
  it('sin elegir, la de arranque: la primera declarada', () => {
    expect(unidadDe(BILIRRUBINA, {})).toBe('mg/dL');
  });

  it('un campo numérico arranca en su unidad, aunque no tenga alternativas', () => {
    expect(unidadDe({ ...PESO, unidades: undefined }, {})).toBe('kg');
  });

  it('las bandas se reescriben en la unidad elegida', () => {
    expect(opcionesDe(BILIRRUBINA, { bilirrubina: 'umol/L' })[1]?.etiqueta).toBe('34 – 50');
  });

  it('cambiar de unidad no cambia los puntos: es la misma banda con otro rótulo', () => {
    const enUmol = { bilirrubina: 'media' };
    expect(puntajeParcial([BILIRRUBINA], enUmol)).toBe(2);
  });

  it('una unidad que ya no está en la declaración cae a las de base, no deja el campo vacío', () => {
    expect(opcionesDe(BILIRRUBINA, { bilirrubina: 'mEq/L' })).toEqual(BILIRRUBINA.opciones);
  });

  it('el rango es el de la unidad activa: uno escrito para kg rechazaría libras normales', () => {
    expect(rangoDe(PESO, { peso: 'lb' }).max).toBe(880);
    expect(rangoDe(PESO, {}).max).toBe(400);
  });
});
