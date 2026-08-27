/** El Buscador: cómo se agrupa y se cuenta lo que se está mirando. */

/**
 * El conteo que se muestra al lado del buscador.
 *
 * Hubo un tope de render de 30 filas. Salió: el catálogo se filtra entero en
 * el teléfono, así que se conocen todas las coincidencias, y `FlashList`
 * recicla — dibujar 542 filas cuesta lo mismo que dibujar 30. El corte venía
 * de cuando lo hacía el servidor y no tenía por qué sobrevivirlo.
 *
 * Lo que sí sigue siendo un límite es bajar el catálogo entero al teléfono, y
 * eso deja de servir en algún punto entre unos miles de productos y decenas de
 * miles. Está anotado como pendiente aparte: cuando llegue, el corte vuelve
 * pero del lado del servidor, con `pg_trgm`, que ya está montado.
 */

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
    return String(coincidencias);
  }
  return totalCatalogo === undefined ? '' : `${totalCatalogo} productos`;
}
