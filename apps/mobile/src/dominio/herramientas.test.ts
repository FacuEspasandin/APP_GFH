import { describe, expect, it } from 'vitest';

import {
  agrupar,
  buscar,
  categoriasConContenido,
  filtrarPorCategoria,
  HERRAMIENTAS,
  partir,
  relevantesDe,
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
    // «Laboratorio» apareció sola al sumar la calculadora de LDL: es el
    // comportamiento que se quiere, la categoría se enciende con su primera
    // herramienta.
    expect(hay).toContain('laboratorio');
    // «Embarazo» se encendió con la fecha probable de parto — antes no tenía
    // ninguna herramienta.
    expect(hay).toContain('embarazo');
  });

  it('respeta el orden declarado y no el de aparición', () => {
    expect(categoriasConContenido()).toEqual([
      'renal',
      'hepatico',
      'embarazo',
      'interacciones',
      'condiciones',
      'dosis',
      'laboratorio',
      'cardiovascular',
      'neurologico',
      'criticos',
    ]);
  });
});

describe('filtrar por categoría', () => {
  it('«Riñón» trae las calculadoras y el ajuste', () => {
    expect(claves(filtrarPorCategoria(HERRAMIENTAS, 'renal')).sort()).toEqual(['clcr', 'fena', 'renal']);
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
    // «child» está en el título de la calculadora y en las palabras extra del
    // ajuste por fármaco: las dos son de Child-Pugh, la calculadora primero
    // porque lo tiene en el título.
    expect(claves(buscar(HERRAMIENTAS, 'child'))).toEqual(['child-pugh', 'ajuste-hepatico']);
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
    expect(buscar(HERRAMIENTAS, 'wxyz-no-existe')).toEqual([]);
  });

  it('encuentra HAS-BLED por "warfarina", aunque no esté en el título', () => {
    expect(claves(buscar(HERRAMIENTAS, 'warfarina'))).toEqual(['has-bled']);
  });
});

describe('agrupar', () => {
  it('secciona las calculadoras por aparato, y deja "Contra el catálogo" aparte al final', () => {
    const g = agrupar(HERRAMIENTAS);
    expect(g.map((x) => x.titulo)).toEqual([
      'Riñón',
      'Hígado',
      'Embarazo',
      'Dosis',
      'Laboratorio',
      'Cardiovascular',
      'Neurológico',
      'Cuidados críticos',
      'Contra el catálogo',
    ]);
    // Ninguna calculadora se pierde al seccionar: la suma da lo mismo que antes.
    expect(g.reduce((total, x) => total + x.herramientas.length, 0)).toBe(HERRAMIENTAS.length);
  });

  it('alfabético por título adentro de cada sección', () => {
    const g = agrupar(HERRAMIENTAS);
    const seccion = (titulo: string) => claves(g.find((x) => x.titulo === titulo)!.herramientas);

    expect(seccion('Riñón')).toEqual(['clcr', 'fena']);
    expect(seccion('Hígado')).toEqual(['child-pugh', 'meld']);
    expect(seccion('Dosis')).toEqual(['peso-ideal', 'superficie-corporal']);
    expect(seccion('Laboratorio')).toEqual([
      'calcio-corregido',
      'ldl',
      'hba1c',
      'homa-ir',
      'imc',
      'riesgo-cv',
      'sodio-corregido',
    ]);
    expect(seccion('Cardiovascular')).toEqual(['cha2ds2-vasc', 'has-bled', 'qtc', 'wells']);
    expect(seccion('Neurológico')).toEqual(['glasgow', 'nihss']);
    expect(seccion('Cuidados críticos')).toEqual(['anion-gap', 'curb-65', 'gap-osmolar', 'qsofa', 'sofa']);
  });

  it('ordena por TÍTULO y no por clave dentro de "Contra el catálogo"', () => {
    // «Ajuste renal por fármaco» va primero aunque su clave sea `renal`: lo
    // que el médico recorre con el ojo es el título.
    const g = agrupar(HERRAMIENTAS);
    const contraElCatalogo = g.find((x) => x.titulo === 'Contra el catálogo')!;
    expect(contraElCatalogo.herramientas.map((h) => h.titulo)).toEqual([
      'Ajuste hepático por fármaco',
      'Ajuste renal por fármaco',
      'Condición y alergia',
      'Interacción fármaco-fármaco',
    ]);
  });

  it('no dibuja una sección vacía', () => {
    // Filtrando por «Laboratorio» sobra el título «Contra el catálogo» encima
    // de nada: ninguna herramienta que cruza el catálogo es de laboratorio.
    const soloLaboratorio = filtrarPorCategoria(HERRAMIENTAS, 'laboratorio');
    expect(agrupar(soloLaboratorio).map((x) => x.titulo)).toEqual(['Laboratorio']);
  });

  it('sin nada devuelve cero grupos', () => {
    expect(agrupar([])).toEqual([]);
  });

  it('sin especialidad, el orden es el declarado en CATEGORIAS', () => {
    expect(agrupar(HERRAMIENTAS, relevantesDe(null))).toEqual(agrupar(HERRAMIENTAS));
  });

  it('especialidad: adelanta la SECCIÓN relevante entera, el resto sigue en su orden', () => {
    // Nefrología sólo tiene 'renal': la sección "Riñón" pasa a ser la
    // primera, sin sacar ni reordenar ninguna otra sección.
    const g = agrupar(HERRAMIENTAS, relevantesDe('Nefrología'));
    expect(g.map((x) => x.titulo)).toEqual([
      'Riñón',
      'Hígado',
      'Embarazo',
      'Dosis',
      'Laboratorio',
      'Cardiovascular',
      'Neurológico',
      'Cuidados críticos',
      'Contra el catálogo',
    ]);
    expect(claves(g[0]!.herramientas)).toEqual(['clcr', 'fena']);

    // Dentro de "Contra el catálogo" (chica, sin sub-secciones) sigue
    // adelantando por ítem, como antes.
    const contraElCatalogo = g.find((x) => x.titulo === 'Contra el catálogo')!;
    expect(claves(contraElCatalogo.herramientas)).toEqual([
      'renal',
      'ajuste-hepatico',
      'condicion-alergia',
      'interacciones',
    ]);
  });

  it('especialidad con dos aparatos: las dos secciones se adelantan, en el orden declarado de CATEGORIAS', () => {
    // Cardiología: 'laboratorio' y 'cardiovascular' — en CATEGORIAS,
    // laboratorio va antes que cardiovascular, así que ese orden se respeta
    // también adelantadas.
    const g = agrupar(HERRAMIENTAS, relevantesDe('Cardiología'));
    expect(g.map((x) => x.titulo)).toEqual([
      'Laboratorio',
      'Cardiovascular',
      'Riñón',
      'Hígado',
      'Embarazo',
      'Dosis',
      'Neurológico',
      'Cuidados críticos',
      'Contra el catálogo',
    ]);
  });

  it('«Clínica médica» no adelanta nada: no tiene aparato propio', () => {
    expect(agrupar(HERRAMIENTAS, relevantesDe('Clínica médica'))).toEqual(agrupar(HERRAMIENTAS));
  });
});

describe('relevantesDe', () => {
  it('sin especialidad, conjunto vacío', () => {
    expect(relevantesDe(null)).toEqual(new Set());
    expect(relevantesDe(undefined)).toEqual(new Set());
  });

  it('nunca es una lista aparte: sale de las categorías ya declaradas', () => {
    // Nefrología → 'renal' → exactamente las herramientas que ya tienen esa
    // categoría, ni una más.
    expect(relevantesDe('Nefrología')).toEqual(new Set(claves(filtrarPorCategoria(HERRAMIENTAS, 'renal'))));
  });

  it('es orden, no filtro: nunca saca ninguna herramienta de la lista', () => {
    for (const especialidad of ['Cardiología', 'Nefrología', 'Hepatología', 'Geriatría', 'Oncología'] as const) {
      const relevantes = relevantesDe(especialidad);
      const g = agrupar(HERRAMIENTAS, relevantes);
      const total = g.flatMap((x) => x.herramientas).length;
      expect(total).toBe(HERRAMIENTAS.length);
    }
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
