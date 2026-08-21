/**
 * Las vías de administración, en un solo lugar.
 *
 * Estaban en tres: el mapa con los rótulos legibles vivía en el backend
 * —`historial/redaccion.ts`, que es el único que las escribía— y las dos
 * pantallas del móvil que las hacen elegir tenían cada una su propia lista de
 * ocho códigos, copiada. Tres copias de un vocabulario que sale de un enum de
 * Prisma: exactamente lo que `severidad.ts` documenta que no hay que hacer.
 *
 * El esquema acepta **dieciséis** y el móvil ofrecía ocho. No es un descuido a
 * corregir sumando las otras: hay dos vocabularios distintos y conviene que se
 * vea cuál es cuál.
 */

/**
 * Todas las que el esquema acepta. El orden es el del enum de Prisma.
 *
 * Se divide en dos porque son dos cosas: las primeras vienen del vocabulario de
 * la fuente del catálogo —`NO_ESPECIFICADA` incluida, que es lo que llega
 * cuando el dato no está— y las otras existen para que un médico prescriba.
 */
export const VIAS_DE_LA_FUENTE = [
  'NO_ESPECIFICADA',
  'ORAL',
  'IV',
  'SC',
  'TOPICA',
  'INHALATORIA',
  'INTRAOCULAR',
  'OTRA',
] as const;

export const VIAS_PARA_PRESCRIBIR = [
  'IM',
  'SUBLINGUAL',
  'RECTAL',
  'VAGINAL',
  'NASAL',
  'TRANSDERMICA',
  'OFTALMICA',
  'OTICA',
] as const;

export type ViaAdministracion =
  | (typeof VIAS_DE_LA_FUENTE)[number]
  | (typeof VIAS_PARA_PRESCRIBIR)[number];

/**
 * Las que se le ofrecen al médico al cargar un fármaco, en orden de uso.
 *
 * No son las dieciséis: `NO_ESPECIFICADA` no se elige —es lo que llega cuando
 * el dato falta, no algo que alguien quiera poner— y las oftálmicas, óticas y
 * vaginales alargan una lista que se toca con el pulgar para cubrir casos que
 * en la práctica se cargan como tópica. Se pueden sumar el día que alguien las
 * pida; agregarlas «por completitud» es empeorar la pantalla de todos por un
 * caso que todavía no apareció.
 */
export const VIAS_OFRECIDAS = [
  'ORAL',
  'IV',
  'SC',
  'IM',
  'TOPICA',
  'INHALATORIA',
  'SUBLINGUAL',
  'RECTAL',
] as const satisfies readonly ViaAdministracion[];

/** Cómo se escribe cada una. Las claves son el enum tal cual. */
const ROTULOS: Record<string, string> = {
  ORAL: 'vía oral',
  IV: 'vía intravenosa',
  IM: 'vía intramuscular',
  SC: 'vía subcutánea',
  TOPICA: 'vía tópica',
  INHALATORIA: 'vía inhalatoria',
  INTRAOCULAR: 'vía intraocular',
  OFTALMICA: 'vía oftálmica',
  OTICA: 'vía ótica',
  RECTAL: 'vía rectal',
  VAGINAL: 'vía vaginal',
  TRANSDERMICA: 'vía transdérmica',
  SUBLINGUAL: 'vía sublingual',
  NASAL: 'vía nasal',
  OTRA: 'otra vía',
};

/**
 * Cómo se escribe una vía, o `null` si no se escribe.
 *
 * `NO_ESPECIFICADA` devuelve `null`: decir «vía no especificada» ocupa un
 * renglón para no informar nada. Quien la muestre tiene que omitirla, no
 * imprimir el `null`.
 *
 * Una vía que no esté en el mapa cae al código en minúsculas. Es feo a
 * propósito: significa que alguien agregó un valor al enum y no lo escribió
 * acá, y verlo en pantalla es más rápido que descubrirlo en un ticket.
 */
export function viaLegible(via: string): string | null {
  if (via === 'NO_ESPECIFICADA') return null;
  return ROTULOS[via] ?? via.toLowerCase();
}

/**
 * Cómo se muestra en un chip, sin el «vía» adelante.
 *
 * En un selector de ocho chips, ocho «vía» repetidos son ruido: la etiqueta del
 * campo ya dice que son vías.
 */
export function viaCorta(via: string): string {
  return viaLegible(via)?.replace(/^vía /, '') ?? via.toLowerCase();
}
