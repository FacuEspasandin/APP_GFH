import { describe, expect, it } from 'vitest';

import { cuantasContestadas, preguntaAbierta, preguntaSiguiente } from './cascada';

const PREGUNTAS = ['a', 'b', 'c', 'd', 'e'] as const;
type P = (typeof PREGUNTAS)[number];

/** Un predicado a partir de las que están contestadas. */
const con = (...hechas: P[]) => (c: P) => hechas.includes(c);

describe('cuál se abre', () => {
  it('vacío abre la primera', () => {
    expect(preguntaAbierta(PREGUNTAS, con(), null)).toBe('a');
  });

  it('avanza a la primera sin contestar', () => {
    expect(preguntaAbierta(PREGUNTAS, con('a', 'b'), null)).toBe('c');
  });

  it('saltea las contestadas aunque estén desordenadas', () => {
    // Corrigiendo se puede llegar a un estado con huecos: la abierta es el
    // primer hueco en el orden de las preguntas, no en el de respuesta.
    expect(preguntaAbierta(PREGUNTAS, con('a', 'c', 'e'), null)).toBe('b');
  });

  it('con todas contestadas no queda ninguna abierta', () => {
    expect(preguntaAbierta(PREGUNTAS, con(...PREGUNTAS), null)).toBeNull();
  });

  it('tocar una ya contestada la abre a ella, y a ninguna más', () => {
    // Es la regla que hace que corregir el segundo criterio no reabra los tres
    // de abajo.
    expect(preguntaAbierta(PREGUNTAS, con(...PREGUNTAS), 'b')).toBe('b');
  });

  it('la abierta a mano gana aunque haya otras sin contestar', () => {
    expect(preguntaAbierta(PREGUNTAS, con('a'), 'a')).toBe('a');
  });
});

describe('el anticipo', () => {
  it('es la siguiente sin contestar', () => {
    expect(preguntaSiguiente(PREGUNTAS, con('a'), 'b')).toBe('c');
  });

  it('saltea las que ya están', () => {
    expect(preguntaSiguiente(PREGUNTAS, con('a', 'c'), 'b')).toBe('d');
  });

  it('corrigiendo una del medio no se anticipa nada', () => {
    // Diría que falta algo que ya está contestado.
    expect(preguntaSiguiente(PREGUNTAS, con(...PREGUNTAS), 'b')).toBeNull();
  });

  it('sin nada abierto tampoco', () => {
    expect(preguntaSiguiente(PREGUNTAS, con(), null)).toBeNull();
  });

  it('en la última no hay siguiente', () => {
    expect(preguntaSiguiente(PREGUNTAS, con('a', 'b', 'c', 'd'), 'e')).toBeNull();
  });
});

describe('el contador', () => {
  it('cuenta las contestadas', () => {
    expect(cuantasContestadas(PREGUNTAS, con('a', 'c'))).toBe(2);
    expect(cuantasContestadas(PREGUNTAS, con())).toBe(0);
    expect(cuantasContestadas(PREGUNTAS, con(...PREGUNTAS))).toBe(5);
  });
});

describe('sirve para una lista de otro largo', () => {
  // La segunda calculadora que la usa —edad vascular— tiene cinco preguntas
  // pero de otra forma. Que ande con dos y con diez es lo que la hace general.
  const dos = ['x', 'y'] as const;
  it('con dos preguntas', () => {
    expect(preguntaAbierta(dos, (c) => c === 'x', null)).toBe('y');
    expect(cuantasContestadas(dos, (c) => c === 'x')).toBe(1);
  });

  it('con una lista vacía no hay nada abierto', () => {
    expect(preguntaAbierta([], () => false, null)).toBeNull();
  });
});
