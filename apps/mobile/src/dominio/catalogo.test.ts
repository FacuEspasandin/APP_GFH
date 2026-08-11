import { describe, expect, it } from 'vitest';

import { cambiaDeLetra, inicialDe, textoConteo, TOPE_BUSQUEDA } from './catalogo';

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

  it('al llegar al corte del backend lo aclara', () => {
    // "30 resultados" haría creer que no hay más y que no vale la pena afinar.
    expect(textoConteo(true, TOPE_BUSQUEDA)).toBe('primeros 30');
  });

  it('sin resultados no muestra un cero suelto', () => {
    expect(textoConteo(true, 0)).toBe('');
  });
});
