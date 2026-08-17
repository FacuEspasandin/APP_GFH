import { describe, expect, it } from 'vitest';

import {
  BORRADOR_VACIO,
  borradorDesde,
  criterioAbierto,
  criterioSiguiente,
  cuantosContestados,
  cuerpoDeGuardado,
  evaluar,
  sePuedeGuardar,
  textoDeFaltantes,
  valoresExactos,
  type Borrador,
} from './hepatico';

const b = (p: Partial<Borrador> = {}): Borrador => ({ ...BORRADOR_VACIO, ...p });

/** Los cinco contestados: 3 + 2 + 1 + leve(2) + ausente(1) = 9 → clase B. */
const COMPLETO = b({
  bilirrubina: 3,
  albumina: 2,
  inr: 1,
  ascitis: 'LEVE',
  encefalopatia: 'AUSENTE',
});

describe('el puntaje sale de las bandas', () => {
  it('con los cinco contestados hay clase', () => {
    const r = evaluar(COMPLETO);
    expect(r.puntos).toBe(9);
    expect(r.clase).toBe('B');
  });

  it('con uno sin contestar no hay clase, y se dice cuál falta', () => {
    // Regla 5: un Child-Pugh incompleto redondeado diría «A» de alguien que
    // puede ser C.
    const r = evaluar(b({ ...COMPLETO, encefalopatia: null }));
    expect(r.clase).toBeNull();
    expect(r.puntos).toBe(8);
    expect(textoDeFaltantes(r.faltan)).toBe('Falta encefalopatía.');
  });

  it('el valor exacto NO cambia el puntaje', () => {
    // Es la garantía de la opción B: la banda decide, el número acompaña.
    const conValor = b({ ...COMPLETO, bilirrubinaValor: '9.9' });
    expect(evaluar(conValor).puntos).toBe(evaluar(COMPLETO).puntos);
    expect(evaluar(conValor).clase).toBe(evaluar(COMPLETO).clase);
  });

  it('vacío no puntúa nada', () => {
    expect(evaluar(BORRADOR_VACIO).puntos).toBe(0);
    expect(evaluar(BORRADOR_VACIO).clase).toBeNull();
  });
});

describe('el valor exacto', () => {
  it('convierte a las unidades del esquema', () => {
    const x = b({ bilirrubinaValor: '34.2', unidadBilirrubina: 'umol/L' });
    expect(valoresExactos(x).bilirrubinaMgDl).toBeCloseTo(2, 5);
  });

  it('acepta coma decimal, que es lo que pone el teclado en español', () => {
    expect(valoresExactos(b({ inrValor: '1,8' })).inr).toBe(1.8);
  });

  it('texto que no es número no vale', () => {
    expect(valoresExactos(b({ inrValor: 'abc' })).inr).toBeUndefined();
  });
});

describe('qué se manda al servidor', () => {
  it('manda los puntos, que es de donde sale la clase', () => {
    expect(cuerpoDeGuardado(COMPLETO)).toEqual({
      bilirrubinaPuntos: 3,
      albuminaPuntos: 2,
      inrPuntos: 1,
      ascitis: 'LEVE',
      encefalopatia: 'AUSENTE',
    });
  });

  it('el valor exacto va sólo si el médico lo anotó', () => {
    const cuerpo = cuerpoDeGuardado(b({ bilirrubina: 2, bilirrubinaValor: '2.4' }));
    expect(cuerpo).toEqual({ bilirrubinaPuntos: 2, bilirrubinaMgDl: 2.4 });
  });

  it('un criterio sin contestar se omite en vez de mandarse en null', () => {
    // Vaciar no es una acción del médico: es un dato que todavía no llegó, y
    // borrar el valor viejo del paciente sería perder información.
    expect(cuerpoDeGuardado(b({ inr: 1 }))).toEqual({ inrPuntos: 1 });
  });

  it('sin nada contestado no hay nada para guardar', () => {
    expect(sePuedeGuardar(BORRADOR_VACIO)).toBe(false);
    expect(sePuedeGuardar(b({ ascitis: 'AUSENTE' }))).toBe(true);
  });
});

describe('la cascada', () => {
  it('vacío abre el primero y anticipa el segundo', () => {
    expect(criterioAbierto(BORRADOR_VACIO, null)).toBe('bilirrubina');
    expect(criterioSiguiente(BORRADOR_VACIO, 'bilirrubina')).toBe('albumina');
  });

  it('avanza al primero sin contestar', () => {
    const x = b({ bilirrubina: 1, albumina: 2 });
    expect(criterioAbierto(x, null)).toBe('inr');
    expect(cuantosContestados(x)).toBe(2);
  });

  it('con los cinco listos no queda ninguno abierto', () => {
    expect(criterioAbierto(COMPLETO, null)).toBeNull();
    expect(criterioSiguiente(COMPLETO, null)).toBeNull();
    expect(cuantosContestados(COMPLETO)).toBe(5);
  });

  it('tocar uno ya contestado lo abre a él, y a ninguno más', () => {
    // Corregir el segundo no puede reabrir los tres de abajo.
    expect(criterioAbierto(COMPLETO, 'albumina')).toBe('albumina');
  });

  it('corrigiendo uno del medio no se anticipa nada', () => {
    // El anticipo diría que falta algo que ya está contestado.
    expect(criterioSiguiente(COMPLETO, 'albumina')).toBeNull();
  });

  it('el anticipo saltea los que ya están', () => {
    const x = b({ bilirrubina: 1, inr: 2 });
    expect(criterioSiguiente(x, 'albumina')).toBe('ascitis');
  });
});

describe('reabrir un paciente guardado', () => {
  it('usa la banda guardada', () => {
    const x = borradorDesde({
      bilirrubinaPuntos: 3,
      albuminaPuntos: null,
      inrPuntos: null,
      bilirrubinaMgDl: null,
      albuminaGDl: null,
      inr: null,
      ascitis: null,
      encefalopatia: null,
    });
    expect(x.bilirrubina).toBe(3);
  });

  it('sin banda, la deriva del valor viejo', () => {
    // Los pacientes cargados antes del cambio tienen el número y no el puntaje.
    // Sin este respaldo, abrirlos mostraría las bandas apagadas al lado de su
    // Child-Pugh guardado, que se leería como un error.
    const x = borradorDesde({
      bilirrubinaMgDl: 2.5,
      albuminaGDl: 3.1,
      inr: 1.9,
      ascitis: 'LEVE',
      encefalopatia: 'AUSENTE',
    });
    expect([x.bilirrubina, x.albumina, x.inr]).toEqual([2, 2, 2]);
    expect(evaluar(x).clase).toBe('B');
  });

  it('conserva el valor exacto para poder mostrarlo', () => {
    const x = borradorDesde({
      bilirrubinaMgDl: 2.5,
      albuminaGDl: null,
      inr: null,
      ascitis: null,
      encefalopatia: null,
    });
    expect(x.bilirrubinaValor).toBe('2.5');
  });

  it('un paciente sin nada cargado abre vacío', () => {
    const x = borradorDesde({
      bilirrubinaMgDl: null,
      albuminaGDl: null,
      inr: null,
      ascitis: null,
      encefalopatia: null,
    });
    expect(cuantosContestados(x)).toBe(0);
  });
});
