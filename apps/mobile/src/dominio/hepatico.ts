import {
  albuminaAGDl,
  bilirrubinaAMgDl,
  childPughDePuntos,
  puntosAlbumina,
  puntosBilirrubina,
  puntosInr,
  type Ascitis,
  type ChildPughClase,
  type CriterioChildPugh,
  type Encefalopatia,
  type Punto,
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

// Las bandas se mudaron a `shared-types`: el backend las necesita para
// escribir el historial. Se re-exportan para que las pantallas sigan
// importando de un solo lugar.
export {
  BANDAS_ALBUMINA,
  BANDAS_BILIRRUBINA,
  BANDAS_INR,
  textoBanda,
  type Banda,
} from '@gfh/shared-types';

/**
 * Lo que el médico contestó en pantalla.
 *
 * Los tres de laboratorio son BANDAS y no números: la escala no distingue una
 * bilirrubina de 2,4 de una de 2,9 —las dos son «2 – 3», dos puntos—, así que
 * pedir el valor exacto era pedir un dato más fino del que el cálculo usa.
 *
 * El valor exacto sigue existiendo como texto opcional, y **no decide nada**:
 * se guarda para que el historial del paciente pueda decir el número. La
 * herramienta suelta ni lo muestra, porque descarta todo igual.
 */
export interface Borrador {
  bilirrubina: Punto | null;
  bilirrubinaValor: string;
  unidadBilirrubina: UnidadBilirrubina;
  albumina: Punto | null;
  albuminaValor: string;
  unidadAlbumina: UnidadAlbumina;
  inr: Punto | null;
  inrValor: string;
  ascitis: Ascitis | null;
  encefalopatia: Encefalopatia | null;
}

export const BORRADOR_VACIO: Borrador = {
  bilirrubina: null,
  bilirrubinaValor: '',
  unidadBilirrubina: 'mg/dL',
  albumina: null,
  albuminaValor: '',
  unidadAlbumina: 'g/dL',
  inr: null,
  inrValor: '',
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

/** Los valores exactos, en las unidades que guarda el esquema. `undefined` el
 *  que el médico no anotó — que es lo normal, porque son opcionales. */
export function valoresExactos(b: Borrador) {
  const bili = aNumero(b.bilirrubinaValor);
  const alb = aNumero(b.albuminaValor);

  return {
    bilirrubinaMgDl: bili === undefined ? undefined : bilirrubinaAMgDl(bili, b.unidadBilirrubina),
    albuminaGDl: alb === undefined ? undefined : albuminaAGDl(alb, b.unidadAlbumina),
    inr: aNumero(b.inrValor),
  };
}

export function evaluar(b: Borrador): ResultadoChildPugh {
  return childPughDePuntos({
    bilirrubina: b.bilirrubina ?? undefined,
    albumina: b.albumina ?? undefined,
    inr: b.inr ?? undefined,
    ascitis: b.ascitis ?? undefined,
    encefalopatia: b.encefalopatia ?? undefined,
  });
}

/**
 * Qué banda resaltar. Devuelve `null` con el criterio sin contestar: ninguna
 * encendida es distinto de la primera encendida.
 */
export function bandaActiva(puntos: number | null): number | null {
  return puntos === null ? null : puntos - 1;
}

// --- la cascada --------------------------------------------------------------

/** Los cinco, en el orden en que se preguntan. */
export const CRITERIOS: readonly CriterioChildPugh[] = [
  'bilirrubina',
  'albumina',
  'inr',
  'ascitis',
  'encefalopatia',
];

export function contestado(b: Borrador, c: CriterioChildPugh): boolean {
  return b[c] !== null;
}

/**
 * Cuál se muestra abierto.
 *
 * El primero sin contestar, salvo que el médico haya tocado uno ya contestado
 * para corregirlo. Devuelve `null` con los cinco listos: ahí no hay nada
 * abierto y se ven los cinco renglones plegados.
 *
 * `abiertoAMano` gana siempre para que corregir el segundo no cierre lo que ya
 * estaba: tocar un renglón plegado tiene que abrir ESE y ninguno más.
 */
export function criterioAbierto(
  b: Borrador,
  abiertoAMano: CriterioChildPugh | null,
): CriterioChildPugh | null {
  if (abiertoAMano !== null) return abiertoAMano;
  return CRITERIOS.find((c) => !contestado(b, c)) ?? null;
}

/**
 * El que se muestra apagado abajo del abierto, como anticipo.
 *
 * Sólo mientras se está completando: corrigiendo uno del medio, el anticipo
 * diría que falta algo que ya está contestado.
 */
export function criterioSiguiente(
  b: Borrador,
  abierto: CriterioChildPugh | null,
): CriterioChildPugh | null {
  if (abierto === null) return null;
  const desde = CRITERIOS.indexOf(abierto) + 1;
  return CRITERIOS.slice(desde).find((c) => !contestado(b, c)) ?? null;
}

/** Cuántos contestados, para el «3 de 5». */
export function cuantosContestados(b: Borrador): number {
  return CRITERIOS.filter((c) => contestado(b, c)).length;
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
  const v = valoresExactos(b);
  const cuerpo: Record<string, unknown> = {};

  // Las bandas son el dato: de acá sale la clase.
  if (b.bilirrubina !== null) cuerpo.bilirrubinaPuntos = b.bilirrubina;
  if (b.albumina !== null) cuerpo.albuminaPuntos = b.albumina;
  if (b.inr !== null) cuerpo.inrPuntos = b.inr;
  if (b.ascitis !== null) cuerpo.ascitis = b.ascitis;
  if (b.encefalopatia !== null) cuerpo.encefalopatia = b.encefalopatia;

  // Los valores exactos van sólo si el médico los anotó, y no cambian el
  // puntaje: son para que el historial pueda decir el número.
  if (v.bilirrubinaMgDl !== undefined) cuerpo.bilirrubinaMgDl = redondear(v.bilirrubinaMgDl);
  if (v.albuminaGDl !== undefined) cuerpo.albuminaGDl = redondear(v.albuminaGDl);
  if (v.inr !== undefined) cuerpo.inr = redondear(v.inr);

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
  bilirrubinaPuntos?: number | null;
  albuminaPuntos?: number | null;
  inrPuntos?: number | null;
  bilirrubinaMgDl: number | null;
  albuminaGDl: number | null;
  inr: number | null;
  ascitis: string | null;
  encefalopatia: string | null;
}): Borrador {
  const texto = (v: number | null) => (v === null ? '' : String(v));

  /**
   * La banda guardada, o la derivada del valor.
   *
   * Un paciente cargado antes de que la pantalla pasara a bandas puede tener el
   * número y no el puntaje. Sin este respaldo, abrirlo mostraría las bandas
   * apagadas al lado de su Child-Pugh guardado, que se leería como un error.
   */
  const banda = (
    puntos: number | null | undefined,
    valor: number | null,
    desdeValor: (n: number) => Punto,
  ): Punto | null => {
    if (puntos !== null && puntos !== undefined) return puntos as Punto;
    return valor === null ? null : desdeValor(valor);
  };

  return {
    ...BORRADOR_VACIO,
    bilirrubina: banda(p.bilirrubinaPuntos, p.bilirrubinaMgDl, puntosBilirrubina),
    bilirrubinaValor: texto(p.bilirrubinaMgDl),
    albumina: banda(p.albuminaPuntos, p.albuminaGDl, puntosAlbumina),
    albuminaValor: texto(p.albuminaGDl),
    inr: banda(p.inrPuntos, p.inr, puntosInr),
    inrValor: texto(p.inr),
    ascitis: (p.ascitis as Ascitis | null) ?? null,
    encefalopatia: (p.encefalopatia as Encefalopatia | null) ?? null,
  };
}
