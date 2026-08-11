/**
 * La revisión línea por línea de la carga de tratamiento.
 *
 * Es la regla no negociable 2: nada se crea sin confirmación humana. Toda la
 * lógica de qué se puede crear y qué no vive acá para poder fijarla con tests.
 */

export interface LineaRevisable {
  requiereBusquedaManual: boolean;
  elegida: boolean;
  dosisEditada: string;
  frecuenciaEditada: string;
}

/** Una línea sin pauta no se puede crear: es el dato que el catálogo no trae.
 *  Antes se guardaba el literal "a confirmar" adentro del campo dosis. */
export function tienePauta(l: LineaRevisable): boolean {
  return l.dosisEditada.trim().length > 0 && l.frecuenciaEditada.trim().length > 0;
}

export function listasParaCrear<T extends LineaRevisable>(lineas: readonly T[]): T[] {
  return lineas.filter((l) => l.elegida && !l.requiereBusquedaManual && tienePauta(l));
}

/** Elegidas pero sin dosis o frecuencia: hay que avisarlo, no ignorarlas. */
export function elegidasSinPauta(lineas: readonly LineaRevisable[]): number {
  return lineas.filter((l) => l.elegida && !l.requiereBusquedaManual && !tienePauta(l)).length;
}

/** Las líneas que el usuario escribió, sin las vacías ni las de un caracter. */
export function lineasDelTexto(crudo: string): string[] {
  return crudo
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

/** Sólo las reconocidas se pueden elegir: la que no matcheó no tiene producto
 *  al cual apuntar. */
export function elegirTodas<T extends LineaRevisable>(lineas: readonly T[]): T[] {
  return lineas.map((l) => (l.requiereBusquedaManual ? l : { ...l, elegida: true }));
}
