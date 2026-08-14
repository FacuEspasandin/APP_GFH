import { describe, expect, it } from 'vitest';

import {
  agrupar,
  buscar,
  categoriasConContenido,
  filtrarPorCategoria,
  HERRAMIENTAS,
  partir,
  type Herramienta,
} from './herramientas';

const buscarPorClave = (clave: string) => HERRAMIENTAS.find((h) => h.clave === clave)!;
const claves = (hs: readonly Herramienta[]) => hs.map((h) => h.clave);

describe('el catálogo', () => {
  it('no tiene claves repetidas', () => {
    // Se usan como id de la lista y como clave de las recientes: dos iguales
    // harían que abrir una marque la otra.
    const vistas = new Set(HERRAMIENTAS.map((h) => h.clave));
    expect(vistas.size).toBe(HERRAMIENTAS.length);
  });

  it('todas tienen al menos una categoría', () => {
    // Una sin categoría desaparece de todos los chips y sólo se encuentra
    // buscándola por nombre — que es justo lo que no hace quien no la conoce.
    for (const h of HERRAMIENTAS) expect(h.categorias.length).toBeGreaterThan(0);
  });

  it('las dos calculadoras puras no cruzan el catálogo', () => {
    expect(buscarPorClave('clcr').cruza).toBe(false);
    expect(buscarPorClave('child-pugh').cruza).toBe(false);
  });

  it('sólo se ofrecen las categorías que tienen algo adentro', () => {
    // Un chip que filtra a cero es una promesa incumplida.
    const hay = categoriasConContenido();
    expect(hay).toContain('renal');
    expect(hay).toContain('hepatico');
    expect(hay).not.toContain('embarazo');
    expect(hay).not.toContain('laboratorio');
  });

  it('respeta el orden declarado y no el de aparición', () => {
    expect(categoriasConContenido()).toEqual([
      'renal',
      'hepatico',
      'interacciones',
      'condiciones',
      'dosis',
    ]);
  });
});

describe('filtrar por categoría', () => {
  it('«Riñón» trae la calculadora y el ajuste', () => {
    expect(claves(filtrarPorCategoria(HERRAMIENTAS, 'renal')).sort()).toEqual(['clcr', 'renal']);
  });

  it('una herramienta puede estar en dos categorías', () => {
    // El ajuste renal es de riñón y de dosis: obligarla a elegir la escondería
    // de una de las dos.
    expect(claves(filtrarPorCategoria(HERRAMIENTAS, 'dosis'))).toContain('renal');
  });

  it('sin categoría, están todas', () => {
    expect(filtrarPorCategoria(HERRAMIENTAS, null)).toHaveLength(HERRAMIENTAS.length);
  });
});

describe('buscar', () => {
  it('encuentra por título', () => {
    expect(claves(buscar(HERRAMIENTAS, 'child'))).toEqual(['child-pugh']);
  });

  it('encuentra por el detalle, no sólo por el título', () => {
    // «Cockcroft-Gault» está en el detalle del clearance y en ningún título.
    expect(claves(buscar(HERRAMIENTAS, 'cockcroft'))).toEqual(['clcr']);
  });

  it('encuentra por las palabras extra que la pantalla no muestra', () => {
    expect(claves(buscar(HERRAMIENTAS, 'kdigo'))).toEqual(['clcr']);
    expect(claves(buscar(HERRAMIENTAS, 'polifarmacia'))).toEqual(['interacciones']);
  });

  it('el título pesa más que el detalle', () => {
    // Buscando «renal», el ajuste —que lo tiene en el título— va antes que el
    // clearance, que coincide sólo porque su detalle dice «función renal».
    expect(claves(buscar(HERRAMIENTAS, 'renal'))[0]).toBe('renal');
  });

  it('ignora tildes y mayúsculas en los dos lados', () => {
    expect(claves(buscar(HERRAMIENTAS, 'FUNCION HEPATICA'))).toEqual(['child-pugh']);
    expect(claves(buscar(HERRAMIENTAS, 'función hepática'))).toEqual(['child-pugh']);
  });

  it('sin texto devuelve todas, no ninguna', () => {
    expect(buscar(HERRAMIENTAS, '   ')).toHaveLength(HERRAMIENTAS.length);
  });

  it('sin coincidencias devuelve vacío', () => {
    expect(buscar(HERRAMIENTAS, 'warfarina')).toEqual([]);
  });
});

describe('agrupar', () => {
  it('separa lo que calcula de lo que cruza el catálogo', () => {
    const g = agrupar(HERRAMIENTAS);
    expect(g.map((x) => x.titulo)).toEqual(['Calculadoras', 'Contra el catálogo']);
    expect(claves(g[0]!.herramientas)).toEqual(['child-pugh', 'clcr']);
  });

  it('ordena por TÍTULO y no por clave', () => {
    // «Ajuste renal por fármaco» va primero aunque su clave sea `renal`: lo
    // que el médico recorre con el ojo es el título.
    const g = agrupar(HERRAMIENTAS);
    expect(g[1]!.herramientas.map((h) => h.titulo)).toEqual([
      'Ajuste renal por fármaco',
      'Condición y alergia',
      'Interacción fármaco-fármaco',
    ]);
  });

  it('no dibuja una sección vacía', () => {
    // Filtrando por «Hígado» sobra el título «Contra el catálogo» encima de nada.
    const soloHigado = filtrarPorCategoria(HERRAMIENTAS, 'hepatico');
    expect(agrupar(soloHigado).map((x) => x.titulo)).toEqual(['Calculadoras']);
  });

  it('sin nada devuelve cero grupos', () => {
    expect(agrupar([])).toEqual([]);
  });
});

describe('resaltar la coincidencia', () => {
  it('parte el texto en lo que coincide y lo que no', () => {
    expect(partir('Ajuste renal por fármaco', 'renal')).toEqual([
      { texto: 'Ajuste ', coincide: false },
      { texto: 'renal', coincide: true },
      { texto: ' por fármaco', coincide: false },
    ]);
  });

  it('devuelve el original con sus tildes aunque se busque sin ellas', () => {
    const trozos = partir('Función hepática', 'funcion');
    expect(trozos[0]).toEqual({ texto: 'Función', coincide: true });
    expect(trozos.map((t) => t.texto).join('')).toBe('Función hepática');
  });

  it('marca todas las apariciones, no sólo la primera', () => {
    const trozos = partir('renal y más renal', 'renal');
    expect(trozos.filter((t) => t.coincide)).toHaveLength(2);
  });

  it('sin consulta no marca nada', () => {
    expect(partir('Child-Pugh', '')).toEqual([{ texto: 'Child-Pugh', coincide: false }]);
  });

  it('sin coincidencia devuelve el texto entero sin marcar', () => {
    expect(partir('Child-Pugh', 'zzz')).toEqual([{ texto: 'Child-Pugh', coincide: false }]);
  });

  it('nunca pierde ni repite un carácter del original', () => {
    // Es la garantía que importa: los índices se calculan sobre el texto sin
    // tildes y se cortan sobre el original, así que si las dos versiones se
    // desalinearan el resaltado saldría corrido y el texto, roto.
    for (const h of HERRAMIENTAS) {
      for (const q of ['a', 'n', 'ó', 'fármaco', 'CLCR']) {
        expect(partir(h.titulo, q).map((t) => t.texto).join('')).toBe(h.titulo);
        expect(partir(h.detalle, q).map((t) => t.texto).join('')).toBe(h.detalle);
      }
    }
  });
});
