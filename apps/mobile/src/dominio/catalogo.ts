/** El Buscador: cómo se agrupa y se cuenta lo que se está mirando. */

/** Lo que corta el backend al buscar (`CatalogoService.buscarProductos`). */
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
 * Buscando dice cuántos coincidieron; el backend corta en 30, y cuando el corte
 * se alcanza hay que decirlo — "30 resultados" a secas haría creer que no hay
 * más y que no vale la pena afinar la búsqueda.
 */
export function textoConteo(
  buscando: boolean,
  cuantosEnPantalla: number,
  totalCatalogo?: number,
): string {
  if (buscando) {
    if (cuantosEnPantalla === 0) return '';
    return cuantosEnPantalla >= TOPE_BUSQUEDA
      ? `primeros ${TOPE_BUSQUEDA}`
      : String(cuantosEnPantalla);
  }
  return totalCatalogo === undefined ? '' : `${totalCatalogo} productos`;
}
