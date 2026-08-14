import { normalizar } from '@gfh/shared-types';

import type { NombreIcono } from '@/ui/iconos';

/**
 * El catálogo de herramientas sueltas, como dato.
 *
 * Antes era una lista de cinco filas escritas a mano en la pantalla. Está acá
 * porque van a ser veinte: agregar la número seis tiene que ser una entrada en
 * esta lista y nada más, y porque filtrar y buscar se rompen en silencio —una
 * herramienta que no aparece en su categoría no tira ningún error— así que se
 * prueban aparte del `.tsx`.
 */

// --- categorías --------------------------------------------------------------

/**
 * Por **aparato**, no por especialidad.
 *
 * Se evaluó agrupar por especialidad y no cierra: las cinco que cruzan el
 * catálogo —ajuste renal, hepático, embarazo, condición, interacciones— las usa
 * un cardiólogo igual que un nefrólogo, así que caerían todas en un cajón
 * «transversal» que nadie abre. Además la especialidad es una propiedad del
 * médico y no de la herramienta: el anion gap no *es* de emergencia, lo *usa
 * mucho* emergencia. Si algún día se quiere usar, va como orden —«para
 * nefrología» arriba de todo— y no como filtro.
 */
export const CATEGORIAS = [
  'renal',
  'hepatico',
  'embarazo',
  'interacciones',
  'condiciones',
  'dosis',
  'laboratorio',
] as const;

export type CategoriaHerramienta = (typeof CATEGORIAS)[number];

export const NOMBRE_CATEGORIA: Record<CategoriaHerramienta, string> = {
  renal: 'Riñón',
  hepatico: 'Hígado',
  embarazo: 'Embarazo',
  interacciones: 'Interacciones',
  condiciones: 'Condiciones',
  dosis: 'Dosis',
  laboratorio: 'Laboratorio',
};

// --- el catálogo -------------------------------------------------------------

export interface Herramienta {
  clave: string;
  titulo: string;
  detalle: string;
  ruta: string;
  /** `false` = calcula sin cruzar nada, y por eso es libre. */
  cruza: boolean;
  categorias: readonly CategoriaHerramienta[];
  icono: NombreIcono;
  /**
   * Palabras por las que también se encuentra, además del título y el detalle.
   *
   * Sirve para lo que el médico escribe y la pantalla no dice: «cockcroft» está
   * en el detalle, pero «filtrado» o «kdigo» no, y son formas legítimas de
   * buscar el clearance.
   */
  busca?: readonly string[];
}

/**
 * Las dos libres son fórmulas publicadas —Cockcroft-Gault y Child-Pugh— y no
 * consultan el catálogo. Cobrarlas nos pondría a competir con cualquier
 * calculadora web y no defenderían nada.
 */
export const HERRAMIENTAS: readonly Herramienta[] = [
  {
    clave: 'clcr',
    titulo: 'Clearance de creatinina',
    detalle: 'Cockcroft-Gault · función renal',
    ruta: '/herramientas/clcr',
    cruza: false,
    categorias: ['renal'],
    icono: 'calculadora',
    busca: ['clcr', 'filtrado glomerular', 'kdigo', 'aclaramiento'],
  },
  {
    clave: 'child-pugh',
    titulo: 'Child-Pugh',
    detalle: 'Clase A, B o C · función hepática',
    ruta: '/herramientas/hepatico',
    cruza: false,
    categorias: ['hepatico'],
    icono: 'calculadora',
    busca: ['cirrosis', 'bilirrubina', 'albumina', 'inr', 'ascitis'],
  },
  {
    clave: 'renal',
    titulo: 'Ajuste renal por fármaco',
    detalle: 'Cuánto ajustar cada fármaco para un Clcr dado',
    ruta: '/herramientas/renal',
    cruza: true,
    categorias: ['renal', 'dosis'],
    icono: 'gota',
    busca: ['clcr', 'dosis', 'insuficiencia renal'],
  },
  {
    clave: 'condicion-alergia',
    titulo: 'Condición y alergia',
    detalle: 'Un fármaco candidato contra condiciones y alergias',
    ruta: '/herramientas/condicion-alergia',
    cruza: true,
    categorias: ['condiciones'],
    icono: 'alerta',
    busca: ['contraindicacion', 'alergia', 'comorbilidad'],
  },
  {
    clave: 'interacciones',
    titulo: 'Interacción fármaco-fármaco',
    detalle: 'Todos los pares de una lista de fármacos',
    ruta: '/herramientas/interacciones',
    cruza: true,
    categorias: ['interacciones'],
    icono: 'interacciones',
    busca: ['interaccion', 'pares', 'polifarmacia'],
  },
] as const;

// --- filtrar y buscar --------------------------------------------------------

/**
 * Las categorías que hoy tienen algo adentro, en el orden de `CATEGORIAS`.
 *
 * Un chip que filtra a cero es una promesa incumplida: hoy sobran tres
 * —embarazo, dosis suelta, laboratorio— y aparecen solas cuando exista la
 * primera herramienta que caiga ahí.
 */
export function categoriasConContenido(
  herramientas: readonly Herramienta[] = HERRAMIENTAS,
): CategoriaHerramienta[] {
  return CATEGORIAS.filter((c) => herramientas.some((h) => h.categorias.includes(c)));
}

export function filtrarPorCategoria(
  herramientas: readonly Herramienta[],
  categoria: CategoriaHerramienta | null,
): Herramienta[] {
  if (categoria === null) return [...herramientas];
  return herramientas.filter((h) => h.categorias.includes(categoria));
}

/**
 * Busca en el título, en el detalle y en las palabras extra.
 *
 * Sin acentos y sin mayúsculas —`normalizar` es la misma función que usa el
 * backend para comparar nombres de fármacos—, así que «riñon» encuentra
 * «Riñón» y «HEPATICO» encuentra «hepática».
 *
 * El orden pone primero lo que coincide en el TÍTULO: buscando «renal», «Ajuste
 * renal por fármaco» tiene que estar antes que el clearance, que coincide sólo
 * porque su detalle dice «función renal».
 */
export function buscar(herramientas: readonly Herramienta[], consulta: string): Herramienta[] {
  const q = normalizar(consulta.trim());
  if (q === '') return [...herramientas];

  const conPeso = herramientas
    .map((h) => ({ h, peso: peso(h, q) }))
    .filter((x) => x.peso > 0);

  // `sort` de JS no es estable entre pesos iguales en todos los motores viejos,
  // así que el desempate es explícito y alfabético.
  conPeso.sort((a, b) => b.peso - a.peso || a.h.titulo.localeCompare(b.h.titulo, 'es'));
  return conPeso.map((x) => x.h);
}

function peso(h: Herramienta, q: string): number {
  if (normalizar(h.titulo).includes(q)) return 3;
  if (normalizar(h.detalle).includes(q)) return 2;
  if ((h.busca ?? []).some((p) => normalizar(p).includes(q))) return 1;
  return 0;
}

// --- agrupar y ordenar -------------------------------------------------------

export interface GrupoHerramientas {
  titulo: string;
  herramientas: Herramienta[];
}

/**
 * Las dos secciones: **calcula** contra **cruza el catálogo**.
 *
 * Es exactamente lo que decide el precio, y por eso se mantiene aunque los
 * chips filtren por aparato: agrupar por aparato dejaría el candado repartido
 * al azar por la lista.
 *
 * Alfabético adentro de cada una. La alternativa —las más usadas primero—
 * mueve las filas de lugar entre visitas, y eso obliga a leer lo que ya te
 * sabías de memoria.
 */
export function agrupar(herramientas: readonly Herramienta[]): GrupoHerramientas[] {
  const orden = (a: Herramienta, b: Herramienta) => a.titulo.localeCompare(b.titulo, 'es');

  const calculan = herramientas.filter((h) => !h.cruza).sort(orden);
  const cruzan = herramientas.filter((h) => h.cruza).sort(orden);

  return [
    { titulo: 'Calculadoras', herramientas: calculan },
    { titulo: 'Contra el catálogo', herramientas: cruzan },
    // Una sección vacía no se dibuja: filtrando por «Hígado» sobra el título
    // «Contra el catálogo» encima de nada.
  ].filter((g) => g.herramientas.length > 0);
}

// --- resaltar la coincidencia ------------------------------------------------

export interface Trozo {
  texto: string;
  coincide: boolean;
}

/**
 * Parte un texto en trozos, marcando los que coinciden con la búsqueda.
 *
 * Hace falta resaltar también cuando la coincidencia está en el detalle: en una
 * búsqueda de «corregi», una fila que se llama «Anion gap» sin nada marcado
 * parece un error del buscador.
 *
 * Compara sobre el texto sin tildes pero corta sobre el original, para que
 * «Riñón» se devuelva con su eñe y su tilde intactas.
 */
export function partir(texto: string, consulta: string): Trozo[] {
  const q = sinTildes(consulta.trim());
  if (q === '') return [{ texto, coincide: false }];

  const plano = sinTildes(texto);
  const trozos: Trozo[] = [];
  let desde = 0;

  for (;;) {
    const i = plano.indexOf(q, desde);
    if (i === -1) break;
    if (i > desde) trozos.push({ texto: texto.slice(desde, i), coincide: false });
    trozos.push({ texto: texto.slice(i, i + q.length), coincide: true });
    desde = i + q.length;
  }

  if (desde < texto.length) trozos.push({ texto: texto.slice(desde), coincide: false });
  return trozos.length === 0 ? [{ texto, coincide: false }] : trozos;
}

/**
 * Minúsculas y sin tildes, **carácter por carácter**.
 *
 * No usa `normalizar` de shared aunque haga casi lo mismo: aquélla arranca con
 * `.trim()`, y un espacio al principio correría todos los índices contra el
 * texto original. Acá los índices de la versión plana y la original tienen que
 * coincidir uno a uno, porque el corte se hace sobre el original.
 */
function sinTildes(s: string): string {
  return Array.from(s)
    .map((c) => {
      const plano = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Si un carácter no colapsa a uno solo —una ligadura, una mayúscula turca—
      // se deja como estaba: perder el resaltado en esa palabra es mejor que
      // correr los índices y resaltar el pedazo equivocado.
      return plano.length === c.length ? plano : c;
    })
    .join('');
}
