/**
 * Child-Pugh — clasificación de la función hepática.
 *
 * Dominio puro: sin Prisma, sin I/O. Vive en el paquete compartido por la misma
 * razón que el Clcr — la app lo necesita para mostrar la clase mientras el
 * médico escribe los valores, y el backend para guardarla. Dos copias serían
 * dos clases distintas para el mismo paciente el día que una se toque.
 *
 * La escala es publicada y entra tal cual: cinco criterios, uno a tres puntos
 * cada uno, cinco a quince en total. No hay criterio nuestro encima de ella.
 * Lo único propio es la conversión de unidades y la negativa a estimar cuando
 * falta un criterio.
 */

import type { ChildPughClase } from './enums';

// La clase ya vive en `enums.ts`, espejando el enum de Prisma. Se reexporta
// para que quien use la calculadora no tenga que importar de dos lados.
export type { ChildPughClase };

export type Ascitis = 'AUSENTE' | 'LEVE' | 'MODERADA_SEVERA';
export type Encefalopatia = 'AUSENTE' | 'GRADO_1_2' | 'GRADO_3_4';

export type UnidadBilirrubina = 'mg/dL' | 'umol/L';
export type UnidadAlbumina = 'g/dL' | 'g/L';

/** Un criterio sin cargar es `undefined`. No se sustituye por un valor neutro. */
export interface EntradaChildPugh {
  bilirrubinaMgDl?: number;
  albuminaGDl?: number;
  inr?: number;
  ascitis?: Ascitis;
  encefalopatia?: Encefalopatia;
}

export type CriterioChildPugh =
  | 'bilirrubina'
  | 'albumina'
  | 'inr'
  | 'ascitis'
  | 'encefalopatia';

export interface ResultadoChildPugh {
  /** Suma de los criterios cargados. Parcial mientras falte alguno. */
  puntos: number;
  /** `null` mientras falte un criterio: sin los cinco no hay clase. */
  clase: ChildPughClase | null;
  /** Puntos por criterio, `null` el que no vino. Para pintar las bandas. */
  detalle: Record<CriterioChildPugh, number | null>;
  /** Los que faltan, en el orden en que se piden. */
  faltan: CriterioChildPugh[];
  completo: boolean;
}

/**
 * Conversión a las unidades que guarda el esquema.
 *
 * El factor 17.1 es el peso molecular de la bilirrubina: 1 mg/dL = 17.1 µmol/L.
 * La albúmina es sólo un cambio de escala: 1 g/dL = 10 g/L.
 */
export function bilirrubinaAMgDl(valor: number, unidad: UnidadBilirrubina): number {
  return unidad === 'mg/dL' ? valor : valor / 17.1;
}

export function albuminaAGDl(valor: number, unidad: UnidadAlbumina): number {
  return unidad === 'g/dL' ? valor : valor / 10;
}

// --- puntaje de cada criterio ------------------------------------------------

/**
 * Los cortes van con `<` estricto, así que el valor del corte cae en la banda
 * de arriba: una bilirrubina de exactamente 2 mg/dL puntúa 2, no 1. Es como
 * está publicada la escala y como la leen las tablas de referencia.
 */
export function puntosBilirrubina(mgDl: number): 1 | 2 | 3 {
  if (mgDl < 2) return 1;
  if (mgDl <= 3) return 2;
  return 3;
}

/** Al revés que las otras: más albúmina es mejor. */
export function puntosAlbumina(gDl: number): 1 | 2 | 3 {
  if (gDl > 3.5) return 1;
  if (gDl >= 2.8) return 2;
  return 3;
}

export function puntosInr(inr: number): 1 | 2 | 3 {
  if (inr < 1.7) return 1;
  if (inr <= 2.3) return 2;
  return 3;
}

export function puntosAscitis(a: Ascitis): 1 | 2 | 3 {
  return a === 'AUSENTE' ? 1 : a === 'LEVE' ? 2 : 3;
}

export function puntosEncefalopatia(e: Encefalopatia): 1 | 2 | 3 {
  return e === 'AUSENTE' ? 1 : e === 'GRADO_1_2' ? 2 : 3;
}

// --- la clase ----------------------------------------------------------------

export function claseDePuntos(puntos: number): ChildPughClase {
  if (puntos <= 6) return 'A';
  if (puntos <= 9) return 'B';
  return 'C';
}

const ORDEN: CriterioChildPugh[] = [
  'bilirrubina',
  'albumina',
  'inr',
  'ascitis',
  'encefalopatia',
];

export type Punto = 1 | 2 | 3;

/**
 * Los cinco criterios ya puntuados.
 *
 * Es la forma primaria desde que la pantalla se contesta tocando bandas y no
 * escribiendo números: la escala no distingue una bilirrubina de 2,4 de una de
 * 2,9 —las dos son «2 – 3», dos puntos— así que pedir el valor exacto era pedir
 * un dato más fino del que el cálculo usa.
 */
export interface PuntosChildPugh {
  bilirrubina?: Punto;
  albumina?: Punto;
  inr?: Punto;
  ascitis?: Ascitis;
  encefalopatia?: Encefalopatia;
}

/**
 * Calcula sobre lo que haya.
 *
 * Con un criterio sin cargar devuelve `clase: null` y el puntaje parcial. NO se
 * estima ni se completa con el valor más favorable: regla 5 del producto —ante
 * falta de dato, neutro— y además un Child-Pugh incompleto redondeado hacia
 * abajo diría «clase A» de un paciente que puede ser C.
 */
export function childPughDePuntos(p: PuntosChildPugh): ResultadoChildPugh {
  const detalle: Record<CriterioChildPugh, number | null> = {
    bilirrubina: p.bilirrubina ?? null,
    albumina: p.albumina ?? null,
    inr: p.inr ?? null,
    ascitis: p.ascitis === undefined ? null : puntosAscitis(p.ascitis),
    encefalopatia: p.encefalopatia === undefined ? null : puntosEncefalopatia(p.encefalopatia),
  };

  const faltan = ORDEN.filter((c) => detalle[c] === null);
  const puntos = ORDEN.reduce((suma, c) => suma + (detalle[c] ?? 0), 0);
  const completo = faltan.length === 0;

  return {
    puntos,
    clase: completo ? claseDePuntos(puntos) : null,
    detalle,
    faltan,
    completo,
  };
}

/**
 * Lo mismo, partiendo de los valores de laboratorio.
 *
 * Sigue existiendo porque hay dos caminos que traen números y no bandas: la
 * herramienta de la API —que recibe mg/dL— y los pacientes cargados antes de
 * que la pantalla pasara a bandas, cuyos valores viejos hay que poder volver a
 * clasificar.
 */
export function calcularChildPugh(e: EntradaChildPugh): ResultadoChildPugh {
  return childPughDePuntos({
    bilirrubina: e.bilirrubinaMgDl === undefined ? undefined : puntosBilirrubina(e.bilirrubinaMgDl),
    albumina: e.albuminaGDl === undefined ? undefined : puntosAlbumina(e.albuminaGDl),
    inr: e.inr === undefined ? undefined : puntosInr(e.inr),
    ascitis: e.ascitis,
    encefalopatia: e.encefalopatia,
  });
}

// --- las bandas, tal como se muestran ----------------------------------------

export interface Banda {
  texto: string;
  puntos: Punto;
}

/**
 * Las bandas visibles cambian con la unidad, el puntaje no.
 *
 * Son los mismos cortes expresados distinto: 2 mg/dL y 34 µmol/L son el mismo
 * número. Se escriben las dos versiones en vez de convertir el rótulo al vuelo
 * porque «34.2 µmol/L» no es como está publicada la escala.
 *
 * Viven en shared porque las usan los dos lados: la app las dibuja y el backend
 * las escribe en el historial cuando cambia una.
 */
export const BANDAS_BILIRRUBINA: Record<UnidadBilirrubina, Banda[]> = {
  'mg/dL': [
    { texto: '< 2', puntos: 1 },
    { texto: '2 – 3', puntos: 2 },
    { texto: '> 3', puntos: 3 },
  ],
  'umol/L': [
    { texto: '< 34', puntos: 1 },
    { texto: '34 – 50', puntos: 2 },
    { texto: '> 50', puntos: 3 },
  ],
};

export const BANDAS_ALBUMINA: Record<UnidadAlbumina, Banda[]> = {
  'g/dL': [
    { texto: '> 3.5', puntos: 1 },
    { texto: '2.8 – 3.5', puntos: 2 },
    { texto: '< 2.8', puntos: 3 },
  ],
  'g/L': [
    { texto: '> 35', puntos: 1 },
    { texto: '28 – 35', puntos: 2 },
    { texto: '< 28', puntos: 3 },
  ],
};

export const BANDAS_INR: Banda[] = [
  { texto: '< 1.7', puntos: 1 },
  { texto: '1.7 – 2.3', puntos: 2 },
  { texto: '> 2.3', puntos: 3 },
];

/**
 * El rótulo de una banda con su unidad, para el historial.
 *
 * Se usan las unidades del esquema —mg/dL y g/dL— y no la que el médico tenía
 * elegida: el historial es un registro, y dos entradas del mismo paciente en
 * unidades distintas no se pueden comparar de un vistazo.
 */
export function textoBanda(criterio: CriterioChildPugh, puntos: number): string {
  if (criterio === 'bilirrubina') {
    return `${BANDAS_BILIRRUBINA['mg/dL'][puntos - 1]?.texto ?? puntos} mg/dL`;
  }
  if (criterio === 'albumina') {
    return `${BANDAS_ALBUMINA['g/dL'][puntos - 1]?.texto ?? puntos} g/dL`;
  }
  if (criterio === 'inr') return BANDAS_INR[puntos - 1]?.texto ?? String(puntos);
  return String(puntos);
}

// --- textos ------------------------------------------------------------------

export const NOMBRE_CRITERIO: Record<CriterioChildPugh, string> = {
  bilirrubina: 'bilirrubina',
  albumina: 'albúmina',
  inr: 'INR',
  ascitis: 'ascitis',
  encefalopatia: 'encefalopatía',
};

/**
 * Qué significa la clase, en una línea.
 *
 * No dice qué hacer con ningún fármaco: eso sale de la tabla de ajuste, que
 * todavía no existe. Describe el estadio y nada más.
 */
export const GLOSA_CLASE: Record<ChildPughClase, string> = {
  A: 'Cirrosis compensada.',
  B: 'Compromiso funcional significativo.',
  C: 'Enfermedad hepática descompensada.',
};

export const NOMBRE_ASCITIS: Record<Ascitis, string> = {
  AUSENTE: 'Ausente',
  LEVE: 'Leve',
  MODERADA_SEVERA: 'Moderada o severa',
};

export const NOMBRE_ENCEFALOPATIA: Record<Encefalopatia, string> = {
  AUSENTE: 'Ausente',
  GRADO_1_2: 'Grado I–II',
  GRADO_3_4: 'Grado III–IV',
};
