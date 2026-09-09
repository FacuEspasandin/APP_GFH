/**
 * Selección del rango de Child-Pugh aplicable. Análogo a `ajuste-renal.ts`,
 * pero mucho más simple: Child-Pugh no es un continuo, es una de tres clases
 * fijas (A/B/C), así que no hace falta elegir por rango ni contemplar un
 * "techo" — o hay una fila para esa clase, o no hay dato.
 */

export interface RangoChildPugh {
  id: string;
  clase: 'A' | 'B' | 'C';
  textoRecomendacion: string | null;
  tipo: string;
}

/** `null` cuando el catálogo no tiene fila para esta clase — neutro, nunca se
 *  infiere a partir de otra clase (regla no negociable 5). */
export function elegirRangoPorClase(
  rangos: readonly RangoChildPugh[],
  clase: 'A' | 'B' | 'C',
): RangoChildPugh | null {
  return rangos.find((r) => r.clase === clase) ?? null;
}
