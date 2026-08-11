import { describe, expect, it } from 'vitest';

import { paresDe, textoParesLimpios, titularInteracciones } from './interacciones';

describe('cuántos pares se cruzan', () => {
  it('es n·(n−1)/2: todos contra todos', () => {
    expect(paresDe(2)).toBe(1);
    expect(paresDe(3)).toBe(3);
    expect(paresDe(4)).toBe(6);
    expect(paresDe(10)).toBe(45);
  });

  it('con menos de dos fármacos no hay par que cruzar', () => {
    expect(paresDe(0)).toBe(0);
    expect(paresDe(1)).toBe(0);
  });
});

describe('titular del resultado', () => {
  it('sin interacciones lo dice sin inventar tranquilidad', () => {
    expect(titularInteracciones([])).toBe('Sin interacciones conocidas');
  });

  it('manda la peor, aunque sea la única', () => {
    expect(
      titularInteracciones([
        { severidad: 'INFORMATIVA' },
        { severidad: 'INFORMATIVA' },
        { severidad: 'CONTRAINDICADA' },
      ]),
    ).toBe('1 interacción contraindicada');
  });

  it('cuenta cuántas hay de esa gravedad', () => {
    expect(titularInteracciones([{ severidad: 'ALTA' }, { severidad: 'ALTA' }])).toBe(
      '2 interacciones graves',
    );
  });

  it('concuerda en femenino con "interacción"', () => {
    expect(titularInteracciones([{ severidad: 'INFORMATIVA' }])).toBe('1 interacción informativa');
  });
});

describe('los pares sin interacción conocida', () => {
  it('aclaran que el silencio del catálogo no es seguridad (regla 5)', () => {
    expect(textoParesLimpios(3)).toContain('no es lo mismo que decir que sean seguros');
  });

  it('singular y plural', () => {
    expect(textoParesLimpios(1)).toContain('1 par no tiene');
    expect(textoParesLimpios(2)).toContain('2 pares no tienen');
  });

  it('si todos tuvieron interacción no dice nada', () => {
    expect(textoParesLimpios(0)).toBeNull();
  });
});
