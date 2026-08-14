/** El Buscador: cómo se agrupa y se cuenta lo que se está mirando. */

/**
 * Cuántos resultados se dibujan.
 *
 * Es un tope de RENDER, no de búsqueda: desde que el catálogo se filtra en el
 * teléfono se conocen todas las coincidencias, y el corte existe sólo porque
 * nadie recorre 542 filas. Por eso el rótulo puede decir «30 de 542» en vez de
 * «primeros 30», que era lo único que se sabía cuando el corte lo hacía el
 * servidor.
 */
export const TOPE_BUSQUEDA = 30;

/** La letra por la que ordena el backend. Cadena vacía para "no hay anterior",
 *  que hace que el primero siempre imprima su letra. */
export function inicialDe(nombre?: string): string {
  return nombre ? nombre.charAt(0).toUpperCase() : '';
}

export function cambiaDeLetra(actual: string, anterior?: string): boolean {
  return inicialDe(actual) !== inicialDe(anterior);
}

/**
 * El tamaño de lo que se está mirando.
 *
 * Buscando dice cuántas coincidencias hubo. Cuando son más de las que se
 * dibujan hay que decirlo: «30 resultados» a secas haría creer que no hay más y
 * que no vale la pena afinar la búsqueda.
 */
export function textoConteo(
  buscando: boolean,
  coincidencias: number,
  totalCatalogo?: number,
): string {
  if (buscando) {
    if (coincidencias === 0) return '';
    return coincidencias > TOPE_BUSQUEDA
      ? `${TOPE_BUSQUEDA} de ${coincidencias}`
      : String(coincidencias);
  }
  return totalCatalogo === undefined ? '' : `${totalCatalogo} productos`;
}
