/**
 * Las herramientas usadas hace poco.
 *
 * Es lo que más rinde cuando la lista crece: con veinte herramientas un médico
 * usa dos o tres, y sin esto las busca de nuevo cada vez.
 *
 * Guarda **cuáles abriste**, nada más — ni los valores que escribiste ni nada
 * de ningún paciente. Las herramientas sueltas siguen siendo descartables
 * (modelo §5): lo que no se guarda es la consulta, no el hecho de haber
 * entrado.
 */

/** Tres y no cinco: con más, la sección compite con la lista en vez de ser un
 *  atajo, y en un teléfono empuja las secciones reales abajo del pliegue. */
export const MAXIMO_RECIENTES = 3;

/**
 * Pone una herramienta al frente de la lista.
 *
 * Devuelve una lista nueva: si ya estaba, sube al primer lugar en vez de
 * duplicarse — una lista con la misma herramienta tres veces sería el peor
 * resultado posible de la función que existe para ahorrar búsquedas.
 */
export function marcarUsada(
  lista: readonly string[],
  clave: string,
  maximo: number = MAXIMO_RECIENTES,
): string[] {
  return [clave, ...lista.filter((c) => c !== clave)].slice(0, maximo);
}

/**
 * Las recientes que todavía existen en el catálogo, en orden de uso.
 *
 * El filtro contra el catálogo no es defensivo por gusto: la lista vive en el
 * teléfono y el catálogo viaja en la app, así que después de una actualización
 * que renombre o retire una herramienta van a quedar claves que ya no
 * resuelven. Sin esto, la sección mostraría filas en blanco que no abren nada.
 */
export function recientesVigentes<T extends { clave: string }>(
  lista: readonly string[],
  catalogo: readonly T[],
): T[] {
  return lista
    .map((clave) => catalogo.find((h) => h.clave === clave))
    .filter((h): h is T => h !== undefined);
}

/** A partir de cuántas herramientas la sección empieza a valer la pena. */
export const CATALOGO_MINIMO = 7;

/**
 * Si la sección se muestra.
 *
 * Depende del tamaño del CATÁLOGO y no de cuántas recientes haya. Mientras
 * todas las herramientas entran en una pantalla, «usadas hace poco» repite
 * arriba lo que ya se ve abajo: se probó con cinco y las dos recientes eran las
 * mismas dos filas de «Calculadoras», con el mismo ícono y el mismo texto, a
 * tres centímetros de distancia. Un atajo a algo que ya está a la vista no
 * ahorra nada y encima roba la primera pantalla.
 *
 * Con el catálogo grande se da vuelta: ahí la herramienta que usás todos los
 * días está a diez filas de scroll y la sección se paga sola. Por eso el corte
 * es el catálogo — la sección se enciende sola cuando exista la séptima
 * herramienta, sin que haya que acordarse de prenderla.
 */
export function mostrarRecientes(recientes: number, totalCatalogo: number): boolean {
  return recientes > 0 && totalCatalogo >= CATALOGO_MINIMO;
}
