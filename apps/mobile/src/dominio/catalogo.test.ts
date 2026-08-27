import { describe, expect, it } from 'vitest';

import { cambiaDeLetra, inicialDe, textoConteo } from './catalogo';

describe('letra de índice del catálogo', () => {
  it('es la inicial en mayúscula', () => {
    expect(inicialDe('bactrim')).toBe('B');
    expect(inicialDe('Eliquis')).toBe('E');
  });

  it('el primero siempre imprime su letra', () => {
    expect(cambiaDeLetra('Aspirina', undefined)).toBe(true);
  });

  it('no repite la letra entre productos de la misma inicial', () => {
    expect(cambiaDeLetra('Eliquis', 'Enalapril')).toBe(false);
  });

  it('cambia cuando cambia la inicial', () => {
    expect(cambiaDeLetra('Metformina', 'Klaricid')).toBe(true);
  });
});

describe('conteo de lo que se está mirando', () => {
  it('navegando el catálogo dice el total', () => {
    expect(textoConteo(false, 40, 638)).toBe('638 productos');
  });

  it('sin el total todavía, no inventa un número', () => {
    expect(textoConteo(false, 40, undefined)).toBe('');
  });

  it('buscando dice cuántos coincidieron', () => {
    expect(textoConteo(true, 7)).toBe('7');
  });

  it('muchas coincidencias se cuentan todas: ya no hay tope de render', () => {
    // Antes decía «30 de 542», porque sólo se dibujaban 30. Ahora se dibujan
    // las 542 —`FlashList` recicla— así que el número es el número.
    expect(textoConteo(true, 542)).toBe('542');
  });

  it('sin resultados no muestra un cero suelto', () => {
    expect(textoConteo(true, 0)).toBe('');
  });
});
