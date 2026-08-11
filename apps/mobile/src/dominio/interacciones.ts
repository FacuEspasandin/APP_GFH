import {
  peorRango,
  RANGO_POR_SEVERIDAD_INTERACCION,
  type RangoGravedad,
  type SeveridadInteraccion,
} from '@gfh/shared-types';

/** La herramienta de interacciones: cuántos pares y qué decir del resultado. */

/** n·(n−1)/2 — se cruzan todos contra todos. */
export function paresDe(cuantosFarmacos: number): number {
  if (cuantosFarmacos < 2) return 0;
  return (cuantosFarmacos * (cuantosFarmacos - 1)) / 2;
}

export interface ParConSeveridad {
  severidad: SeveridadInteraccion;
}

const ADJETIVO: Record<RangoGravedad, [string, string]> = {
  0: ['contraindicada', 'contraindicadas'],
  1: ['grave', 'graves'],
  2: ['de atención', 'de atención'],
  3: ['informativa', 'informativas'],
};

/** El titular del resultado: la peor gravedad y cuántas hay de ésa. */
export function titularInteracciones(pares: readonly ParConSeveridad[]): string {
  const rangos = pares.map((p) => RANGO_POR_SEVERIDAD_INTERACCION[p.severidad]);
  const peor = peorRango(rangos);
  if (peor === null) return 'Sin interacciones conocidas';

  const n = rangos.filter((r) => r === peor).length;
  const [singular, plural] = ADJETIVO[peor];
  return n === 1 ? `1 interacción ${singular}` : `${n} interacciones ${plural}`;
}

/**
 * "Sin interacción conocida" no es "es seguro": el catálogo cubre lo que cubre.
 * Decir lo contrario sería inferir seguridad (regla 5).
 */
export function textoParesLimpios(sinInteraccion: number): string | null {
  if (sinInteraccion <= 0) return null;
  return `${sinInteraccion} ${
    sinInteraccion === 1 ? 'par no tiene' : 'pares no tienen'
  } interacción conocida en el catálogo, que no es lo mismo que decir que sean seguros.`;
}
