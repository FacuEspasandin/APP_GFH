/**
 * La revisión línea por línea de la carga de tratamiento.
 *
 * Es la regla no negociable 2: nada se crea sin confirmación humana. Toda la
 * lógica de qué se puede crear y qué no vive acá para poder fijarla con tests.
 *
 * Por eso NO existe «elegir todas»: una casilla que marca todo de una vez
 * convierte la confirmación línea por línea en un solo toque.
 */

/** Lo que el backend contestó 409 a una línea: una alergia que la toca. */
export interface ConflictoDeLinea {
  /** `ALERGIA_BLOQUEA` o `ALERGIA_REQUIERE_CONFIRMACION`. */
  codigo: string;
  mensaje: string;
}

export interface LineaRevisable {
  requiereBusquedaManual: boolean;
  elegida: boolean;
  dosisEditada: string;
  frecuenciaEditada: string;
  /** Ya se creó. Reintentar tras un fallo parcial no la vuelve a mandar: sin
   *  esto el segundo toque duplicaba los fármacos que habían salido bien. */
  creada?: boolean;
  /** Lo que dijo el backend la última vez que intentó crearla. */
  conflicto?: ConflictoDeLinea | null;
  /** El médico confirmó, en esta línea, el cruce por familia. */
  confirmaCruce?: boolean;
}

/** Una línea sin pauta no se puede crear: es el dato que el catálogo no trae.
 *  Antes se guardaba el literal "a confirmar" adentro del campo dosis. */
export function tienePauta(l: LineaRevisable): boolean {
  return l.dosisEditada.trim().length > 0 && l.frecuenciaEditada.trim().length > 0;
}

/**
 * Regla 4. Una línea con conflicto de alergia espera una decisión del médico:
 * la coincidencia exacta grave nunca se puede crear, y el cruce por familia
 * sólo después de que lo confirmó explícitamente en esa línea.
 */
export function esperaDecisionPorAlergia(l: LineaRevisable): boolean {
  if (!l.conflicto) return false;
  if (l.conflicto.codigo === 'ALERGIA_BLOQUEA') return true;
  return l.confirmaCruce !== true;
}

export function listasParaCrear<T extends LineaRevisable>(lineas: readonly T[]): T[] {
  return lineas.filter(
    (l) =>
      l.elegida &&
      !l.creada &&
      !l.requiereBusquedaManual &&
      tienePauta(l) &&
      !esperaDecisionPorAlergia(l),
  );
}

/** Elegidas pero sin dosis o frecuencia: hay que avisarlo, no ignorarlas. */
export function elegidasSinPauta(lineas: readonly LineaRevisable[]): number {
  return lineas.filter(
    (l) => l.elegida && !l.creada && !l.requiereBusquedaManual && !tienePauta(l),
  ).length;
}

/** Las líneas que el usuario escribió, sin las vacías ni las de un caracter. */
export function lineasDelTexto(crudo: string): string[] {
  return crudo
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}
