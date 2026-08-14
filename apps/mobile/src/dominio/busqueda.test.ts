import { describe, expect, it } from 'vitest';

import { buscar, contar, peso, PESO, plano, POR_NOMBRE, type Campos } from './busqueda';

interface Ficha {
  nombre: string;
  tambien?: string[];
}

const p = (nombre: string, tambien?: string[]): Ficha => ({ nombre, tambien });

/** Los productos buscan por nombre y también por principio activo. */
const CAMPOS: Campos<Ficha> = { nombre: (x) => x.nombre, tambien: (x) => x.tambien ?? [] };

const CATALOGO: Ficha[] = [
  p('Ibupirac', ['Ibuprofeno', 'Pfizer']),
  p('Dolo-Ibuprofeno', ['Ibuprofeno']),
  p('Abrilar', ['Hedera helix']),
  p('Perifar', ['Ibuprofeno']),
  p('Amoxidal', ['Amoxicilina']),
  p('Ácido acetilsalicílico', ['Aspirina']),
];

const nombres = (xs: readonly Ficha[]) => xs.map((x) => x.nombre);

describe('normalizar para buscar', () => {
  it('baja mayúsculas y saca tildes', () => {
    expect(plano('Ácido Acetilsalicílico')).toBe('acido acetilsalicilico');
  });

  it('la eñe no es una n con tilde y se queda como está', () => {
    expect(plano('Riñón')).toBe('rinon');
  });
});

describe('cuánto pesa cada coincidencia', () => {
  it('empezar con la consulta pesa más que contenerla', () => {
    expect(peso(p('Ibupirac'), 'ibu', CAMPOS)).toBe(PESO.empieza);
    expect(peso(p('Perifar'), 'rifa', CAMPOS)).toBe(PESO.contiene);
  });

  it('una palabra interna que arranca con la consulta va en el medio', () => {
    // «Dolo-Ibuprofeno» con «ibu»: no empieza con eso, pero tampoco es un
    // pedazo perdido en el medio de una palabra.
    expect(peso(p('Dolo-Ibuprofeno'), 'ibu', CAMPOS)).toBe(PESO.palabra);
    expect(peso(p('Ácido acetilsalicílico'), 'acetil', CAMPOS)).toBe(PESO.palabra);
  });

  it('lo que sólo coincide en el principio activo pesa lo mínimo', () => {
    expect(peso(p('Perifar', ['Ibuprofeno']), 'ibu', CAMPOS)).toBe(PESO.tambien);
  });

  it('sin coincidencia, cero', () => {
    expect(peso(p('Abrilar'), 'zzz', CAMPOS)).toBe(PESO.nada);
  });
});

describe('el orden de los resultados', () => {
  it('con «ibu», primero el que empieza con eso', () => {
    // Es el caso que justifica todo el ranking: por orden alfabético, «Abrilar»
    // quedaría arriba de «Ibupirac» buscando «ibu».
    expect(nombres(buscar(CATALOGO, 'ibu', CAMPOS))).toEqual([
      'Ibupirac',
      'Dolo-Ibuprofeno',
      'Perifar',
    ]);
  });

  it('desde la primera letra ya ordena', () => {
    expect(nombres(buscar(CATALOGO, 'a', CAMPOS))[0]).toBe('Abrilar');
  });

  it('empata alfabético y no por el orden de la lista', () => {
    const dos = [p('Zetal'), p('Amoxil')];
    expect(nombres(buscar(dos, 'a', POR_NOMBRE))).toEqual(['Amoxil', 'Zetal']);
  });

  it('encuentra sin tildes lo que las tiene', () => {
    expect(nombres(buscar(CATALOGO, 'acido', CAMPOS))).toEqual(['Ácido acetilsalicílico']);
  });

  it('encuentra por principio activo aunque el nombre no lo diga', () => {
    expect(nombres(buscar(CATALOGO, 'amoxicilina', CAMPOS))).toEqual(['Amoxidal']);
  });

  it('sin consulta devuelve todo, no nada', () => {
    // El buscador no puede esconder el catálogo mientras no se escribe.
    expect(buscar(CATALOGO, '', CAMPOS)).toHaveLength(CATALOGO.length);
    expect(buscar(CATALOGO, '   ', CAMPOS)).toHaveLength(CATALOGO.length);
  });

  it('sin coincidencias devuelve vacío', () => {
    expect(buscar(CATALOGO, 'zzz', CAMPOS)).toEqual([]);
  });

  it('respeta el tope', () => {
    expect(buscar(CATALOGO, 'ibu', CAMPOS, { tope: 2 })).toHaveLength(2);
  });

  it('un paréntesis suelto no lo rompe', () => {
    // El texto del médico va a un RegExp: sin escapar, «(» tiraba la pantalla.
    expect(() => buscar(CATALOGO, '(', CAMPOS)).not.toThrow();
    expect(() => buscar(CATALOGO, 'a)+', CAMPOS)).not.toThrow();
  });

  it('no muta la lista que recibe', () => {
    const antes = nombres(CATALOGO);
    buscar(CATALOGO, 'ibu', CAMPOS);
    expect(nombres(CATALOGO)).toEqual(antes);
  });
});

describe('el conteo', () => {
  it('cuenta todas las coincidencias, no las que entraron en el tope', () => {
    expect(contar(CATALOGO, 'ibu', CAMPOS)).toBe(3);
    expect(buscar(CATALOGO, 'ibu', CAMPOS, { tope: 2 })).toHaveLength(2);
  });

  it('sin consulta cuenta el catálogo entero', () => {
    expect(contar(CATALOGO, '', CAMPOS)).toBe(CATALOGO.length);
  });
});
