import {
  albuminaAGDl,
  bilirrubinaAMgDl,
  calcularChildPugh,
  type Ascitis,
  type ChildPughClase,
  type CriterioChildPugh,
  type Encefalopatia,
  type ResultadoChildPugh,
  type UnidadAlbumina,
  type UnidadBilirrubina,
} from '@gfh/shared-types';

/**
 * Lo que la pantalla de función hepática necesita además del cálculo.
 *
 * El puntaje y la clase salen de `@gfh/shared-types` — son los mismos que usa
 * el backend. Acá vive lo que es de la pantalla: qué bandas mostrar según la
 * unidad elegida, qué texto va cuando falta un criterio, y qué se le manda al
 * servidor.
 */

export type Banda = { texto: string; puntos: 1 | 2 | 3 };

/**
 * Las bandas visibles cambian con la unidad, el puntaje no.
 *
 * Son los mismos cortes expresados distinto: 2 mg/dL y 34 µmol/L son el mismo
 * número. Se escriben las dos versiones en vez de convertir el rótulo al vuelo
 * porque «34.2 µmol/L» no es como está publicada la escala.
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

/** Lo que el médico tiene escrito en pantalla, antes de convertir nada. */
export interface Borrador {
  bilirrubina: string;
  unidadBilirrubina: UnidadBilirrubina;
  albumina: string;
  unidadAlbumina: UnidadAlbumina;
  inr: string;
  ascitis: Ascitis | null;
  encefalopatia: Encefalopatia | null;
}

export const BORRADOR_VACIO: Borrador = {
  bilirrubina: '',
  unidadBilirrubina: 'mg/dL',
  albumina: '',
  unidadAlbumina: 'g/dL',
  inr: '',
  ascitis: null,
  encefalopatia: null,
};

/**
 * Un campo vacío es `undefined` —criterio sin cargar—, y uno con texto que no
 * es un número también. Escribir «abc» no puede valer 1 punto.
 *
 * Acepta coma decimal: el teclado numérico de un teléfono en español la pone.
 */
export function aNumero(texto: string): number | undefined {
  const limpio = texto.replace(',', '.').trim();
  if (limpio === '') return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}

/** El borrador, convertido a las unidades que guarda el esquema. */
export function aEntrada(b: Borrador) {
  const bili = aNumero(b.bilirrubina);
  const alb = aNumero(b.albumina);

  return {
    bilirrubinaMgDl: bili === undefined ? undefined : bilirrubinaAMgDl(bili, b.unidadBilirrubina),
    albuminaGDl: alb === undefined ? undefined : albuminaAGDl(alb, b.unidadAlbumina),
    inr: aNumero(b.inr),
    ascitis: b.ascitis ?? undefined,
    encefalopatia: b.encefalopatia ?? undefined,
  };
}

export function evaluar(b: Borrador): ResultadoChildPugh {
  return calcularChildPugh(aEntrada(b));
}

/**
 * Qué banda resaltar. Devuelve `null` con el campo vacío: ninguna encendida es
 * distinto de la primera encendida.
 */
export function bandaActiva(puntos: number | null): number | null {
  return puntos === null ? null : puntos - 1;
}

/**
 * El cuerpo del PATCH.
 *
 * Manda sólo lo cargado. Un criterio vacío se omite en vez de mandarse como
 * `null`: acá vaciar un campo no es una acción que el médico haga a propósito
 * —es un dato que todavía no llegó— y borrar el valor viejo del paciente sería
 * perder información sin que nadie lo pidiera.
 */
export function cuerpoDeGuardado(b: Borrador): Record<string, unknown> {
  const e = aEntrada(b);
  const cuerpo: Record<string, unknown> = {};

  if (e.bilirrubinaMgDl !== undefined) cuerpo.bilirrubinaMgDl = redondear(e.bilirrubinaMgDl);
  if (e.albuminaGDl !== undefined) cuerpo.albuminaGDl = redondear(e.albuminaGDl);
  if (e.inr !== undefined) cuerpo.inr = redondear(e.inr);
  if (e.ascitis !== undefined) cuerpo.ascitis = e.ascitis;
  if (e.encefalopatia !== undefined) cuerpo.encefalopatia = e.encefalopatia;

  return cuerpo;
}

/** El esquema guarda `Decimal(5,2)`; mandar 2.0526315 sería basura igual. */
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Hay algo para guardar cuando al menos un criterio está cargado. */
export function sePuedeGuardar(b: Borrador): boolean {
  return Object.keys(cuerpoDeGuardado(b)).length > 0;
}

/** «Faltan dos: ascitis y encefalopatía.» */
export function textoDeFaltantes(faltan: readonly CriterioChildPugh[]): string | null {
  if (faltan.length === 0) return null;

  const NOMBRES: Record<CriterioChildPugh, string> = {
    bilirrubina: 'bilirrubina',
    albumina: 'albúmina',
    inr: 'INR',
    ascitis: 'ascitis',
    encefalopatia: 'encefalopatía',
  };

  const nombres = faltan.map((c) => NOMBRES[c]);
  if (nombres.length === 1) return `Falta ${nombres[0]}.`;
  if (nombres.length === 5) return 'Faltan los cinco criterios.';

  const ultimo = nombres[nombres.length - 1];
  return `Faltan ${nombres.slice(0, -1).join(', ')} y ${ultimo}.`;
}

/**
 * El color de la clase.
 *
 * Se devuelve la clave y no el color: la pantalla la resuelve contra la paleta
 * del tema. A verde, B naranja, C rojo — la misma escala de gravedad que usa el
 * resto de la app, no una paleta nueva para esta pantalla.
 */
export function claveColorClase(clase: ChildPughClase | null): 'ok' | 'media' | 'grave' | 'neutro' {
  if (clase === null) return 'neutro';
  return clase === 'A' ? 'ok' : clase === 'B' ? 'media' : 'grave';
}

/** Lo que trae el paciente, de vuelta a borrador editable. */
export function borradorDesde(p: {
  bilirrubinaMgDl: number | null;
  albuminaGDl: number | null;
  inr: number | null;
  ascitis: string | null;
  encefalopatia: string | null;
}): Borrador {
  const texto = (v: number | null) => (v === null ? '' : String(v));

  return {
    ...BORRADOR_VACIO,
    bilirrubina: texto(p.bilirrubinaMgDl),
    albumina: texto(p.albuminaGDl),
    inr: texto(p.inr),
    ascitis: (p.ascitis as Ascitis | null) ?? null,
    encefalopatia: (p.encefalopatia as Encefalopatia | null) ?? null,
  };
}
