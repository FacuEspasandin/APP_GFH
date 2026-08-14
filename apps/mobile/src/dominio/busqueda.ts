/**
 * El buscador predictivo, en el teléfono.
 *
 * Vive acá y no contra el servidor porque el problema nunca fue la consulta.
 * Medido contra la base real: «i» con 542 coincidencias tarda 390 ms y «pirac»
 * con 2 tarda 382 — recorrer 638 filas son microsegundos, los 390 ms son la ida
 * y vuelta a São Paulo. Un índice del lado del servidor no le saca un
 * milisegundo a eso; buscar en el teléfono lo lleva a cero y encima funciona sin
 * señal.
 *
 * Es el mismo motor para todos los buscadores de la app: catálogo, principios
 * activos, condiciones y pacientes. Que cada pantalla ordenara a su manera es lo
 * que hacía que buscar «renal» diera resultados distintos según dónde estuvieras.
 */

/**
 * Minúsculas y sin tildes.
 *
 * No usa `normalizar` de shared: aquélla existe para COMPARAR nombres de
 * fármaco contra el catálogo de reglas y no puede cambiar por un tema de
 * pantalla. Esta se puede tocar libremente.
 */
export function plano(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * De dónde sacar el texto de cada ítem.
 *
 * Va explícito en cada llamada en vez de asumir un campo `nombre`: los
 * productos se llaman `nombreComercial`, los principios activos `nombre`, y
 * obligar a todos a la misma forma terminaría en objetos con el mismo dato dos
 * veces, que es lo que después se desincroniza.
 */
export interface Campos<T> {
  /** Lo que se muestra y por lo que se ordena. */
  nombre: (x: T) => string;
  /**
   * Lo que también encuentra, sin mostrarse: el principio activo de un
   * producto, la descripción de una condición, los sinónimos de un grupo.
   */
  tambien?: (x: T) => readonly string[];
}

/** Para las listas que ya tienen un campo `nombre`, que son la mayoría. */
export const POR_NOMBRE: Campos<{ nombre: string }> = { nombre: (x) => x.nombre };

/**
 * Cuánto pesa una coincidencia. Más alto, más arriba.
 *
 * Los cuatro escalones responden a cómo se busca de verdad. Escribiendo «ibu»,
 * «Ibupirac» tiene que estar antes que «Dolo-Ibuprofeno» —empieza con eso—, y
 * los dos antes que un producto cuyo principio activo es ibuprofeno pero se
 * llama de otra forma. Sin escalones, el orden alfabético manda y «Abrilar»
 * queda arriba de «Ibupirac» buscando «ibu», que es exactamente lo que nadie
 * quiere.
 */
export const PESO = {
  empieza: 4,
  palabra: 3,
  contiene: 2,
  tambien: 1,
  nada: 0,
} as const;

export function peso<T>(item: T, consultaPlana: string, campos: Campos<T>): number {
  const nombre = plano(campos.nombre(item));

  if (nombre.startsWith(consultaPlana)) return PESO.empieza;
  // Una palabra interna que arranca con la consulta: «Dolo-Ibuprofeno» con
  // «ibu». El separador puede ser espacio, guión, barra o paréntesis.
  if (new RegExp(`[\\s\\-/(.,]${escapar(consultaPlana)}`).test(nombre)) return PESO.palabra;
  if (nombre.includes(consultaPlana)) return PESO.contiene;

  const alias = campos.tambien?.(item) ?? [];
  if (alias.some((t) => plano(t).includes(consultaPlana))) return PESO.tambien;

  return PESO.nada;
}

/** El texto del médico va a un `RegExp`: un paréntesis suelto lo haría explotar. */
function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface Opciones {
  /** Cuántos devolver. `undefined` = todos. */
  tope?: number;
  /** Desde cuántas letras busca. Uno: es lo que hace que sea predictivo. */
  minimo?: number;
}

/**
 * Filtra y ordena.
 *
 * Con la consulta vacía —o más corta que el mínimo— devuelve la lista entera sin
 * tocar: el buscador no puede esconder el catálogo mientras no se escribe nada.
 *
 * El desempate es alfabético y explícito. `Array.sort` sólo garantiza
 * estabilidad desde ES2019 y acá el orden importa: dos productos con el mismo
 * peso que cambien de lugar entre teclas hacen saltar la lista bajo el dedo.
 */
export function buscar<T>(
  items: readonly T[],
  consulta: string,
  campos: Campos<T>,
  { tope, minimo = 1 }: Opciones = {},
): T[] {
  const q = plano(consulta.trim());
  if (q.length < minimo) return tope === undefined ? [...items] : items.slice(0, tope);

  const conPeso: { item: T; p: number }[] = [];
  for (const item of items) {
    const p = peso(item, q, campos);
    if (p > PESO.nada) conPeso.push({ item, p });
  }

  conPeso.sort(
    (a, b) => b.p - a.p || campos.nombre(a.item).localeCompare(campos.nombre(b.item), 'es'),
  );

  const ordenados = conPeso.map((x) => x.item);
  return tope === undefined ? ordenados : ordenados.slice(0, tope);
}

/** Cuántos coincidieron en total, antes del tope. Es lo que se muestra al lado
 *  del rótulo, y con tope no se puede deducir de la lista que se devolvió. */
export function contar<T>(
  items: readonly T[],
  consulta: string,
  campos: Campos<T>,
  minimo = 1,
): number {
  const q = plano(consulta.trim());
  if (q.length < minimo) return items.length;

  let n = 0;
  for (const item of items) if (peso(item, q, campos) > PESO.nada) n += 1;
  return n;
}
