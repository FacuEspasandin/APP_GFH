import { describe, expect, it } from 'vitest';

import { marcarUsada, mostrarRecientes, recientesVigentes } from './recientes';

describe('marcar una herramienta como usada', () => {
  it('la pone primera', () => {
    expect(marcarUsada(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('si ya estaba, sube en vez de duplicarse', () => {
    // Una lista con la misma herramienta tres veces sería el peor resultado
    // posible de la función que existe para ahorrar búsquedas.
    expect(marcarUsada(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('corta en el máximo', () => {
    expect(marcarUsada(['a', 'b', 'c'], 'd')).toEqual(['d', 'a', 'b']);
  });

  it('no toca la lista que recibe', () => {
    const antes = ['a', 'b'];
    marcarUsada(antes, 'c');
    expect(antes).toEqual(['a', 'b']);
  });
});

describe('las recientes contra el catálogo', () => {
  const catalogo = [{ clave: 'a' }, { clave: 'b' }];

  it('mantiene el orden de uso, no el del catálogo', () => {
    expect(recientesVigentes(['b', 'a'], catalogo).map((h) => h.clave)).toEqual(['b', 'a']);
  });

  it('descarta las que ya no existen', () => {
    // La lista vive en el teléfono y el catálogo viaja en la app: después de
    // una actualización que retire una herramienta quedan claves colgadas, y
    // sin este filtro la sección mostraría filas que no abren nada.
    expect(recientesVigentes(['z', 'a'], catalogo).map((h) => h.clave)).toEqual(['a']);
  });
});

describe('cuándo se muestra la sección', () => {
  it('nunca sin recientes', () => {
    expect(mostrarRecientes(0, 20)).toBe(false);
  });

  it('con el catálogo chico no se muestra, por muchas recientes que haya', () => {
    // Se probó con cinco herramientas y las dos recientes eran las mismas dos
    // filas de «Calculadoras», a tres centímetros. Un atajo a algo que ya se ve
    // no ahorra nada y roba la primera pantalla.
    expect(mostrarRecientes(1, 5)).toBe(false);
    expect(mostrarRecientes(3, 5)).toBe(false);
  });

  it('con el catálogo grande, una sola ya vale', () => {
    // Ahí la que usás todos los días está a diez filas de scroll.
    expect(mostrarRecientes(1, 20)).toBe(true);
  });

  it('el corte es el catálogo, así que se enciende sola al crecer', () => {
    expect(mostrarRecientes(1, 6)).toBe(false);
    expect(mostrarRecientes(1, 7)).toBe(true);
  });
});
