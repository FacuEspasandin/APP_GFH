/**
 * Elección del rango de Clcr aplicable. Motor §4.3-4.5.
 *
 * Es el punto donde GFH se equivocó dos veces, así que las dos reglas están
 * separadas y testeadas una por una.
 */

export interface RangoClcr {
  id: string;
  orden: number;
  /** null = sin límite inferior */
  clcrMin: number | null;
  /** null = sin límite superior */
  clcrMax: number | null;
  rangoTexto: string;
  textoRecomendacion: string | null;
  tipo: string;
}

export type MotivoEleccion = 'EN_RANGO' | 'POR_ENCIMA_DEL_TECHO';

export interface RangoElegido {
  rango: RangoClcr;
  motivo: MotivoEleccion;
}

/**
 * El intervalo es `(min, max]`: el valor del borde pertenece al rango INFERIOR.
 *
 * Con Clcr = 50 y los tramos 100-50 / 50-30, gana **50-30**, porque `50 > 50`
 * es falso. No es arbitrario: en el borde conviene tratar al riñón como el más
 * deteriorado de las dos lecturas posibles. El error barato es ajustar de más.
 */
function aplica(rango: RangoClcr, clcr: number): boolean {
  const cumpleMin = rango.clcrMin === null || clcr > rango.clcrMin;
  const cumpleMax = rango.clcrMax === null || clcr <= rango.clcrMax;
  return cumpleMin && cumpleMax;
}

/**
 * Devuelve `null` cuando ningún tramo aplica — nunca un rango por defecto.
 * Inventar uno sería el error que este sistema existe para evitar.
 *
 * En la práctica el `null` es inalcanzable con el catálogo actual: las 635
 * tablas tienen su último tramo abierto hacia abajo (`clcrMin = null`).
 * Verificado sobre los datos reales, pero se contempla igual.
 */
export function elegirRango(rangos: readonly RangoClcr[], clcr: number): RangoElegido | null {
  if (rangos.length === 0) return null;

  const enRango = [...rangos]
    .sort((a, b) => a.orden - b.orden)
    .find((r) => aplica(r, clcr));
  if (enRango) return { rango: enRango, motivo: 'EN_RANGO' };

  // Función renal MEJOR que el tramo más alto de la tabla — motor §4.4.
  //
  // Las 635 tablas del catálogo tienen el techo en 100 mL/min, sin excepción.
  // Sin esta regla, un varón de 30 años, 80 kg y creatinina 0,9 (Clcr = 135)
  // se queda sin recomendación: el paciente con función renal NORMAL, que es
  // el más frecuente y el que menos ajuste necesita, vería "sin datos".
  //
  // El techo se busca POR VALOR y no asumiendo que es el orden 0: si algún día
  // los rangos llegaran desordenados, tomar el primero daría el tramo
  // equivocado.
  const techo = rangos.reduce<RangoClcr | null>((mejor, r) => {
    if (r.clcrMax === null) return mejor;
    if (mejor === null || r.clcrMax > mejor.clcrMax!) return r;
    return mejor;
  }, null);

  if (techo !== null && clcr > techo.clcrMax!) {
    return { rango: techo, motivo: 'POR_ENCIMA_DEL_TECHO' };
  }

  return null;
}

/** Motor §4.5 — un fármaco libre no tiene tabla. Con Clcr < 60 se emite una
 *  alerta genérica de texto; NO se sugiere ninguna dosis. */
export const UMBRAL_ALERTA_FARMACO_LIBRE = 60;

export function farmacoLibreRequiereAlerta(clcr: number | null): boolean {
  return clcr !== null && clcr < UMBRAL_ALERTA_FARMACO_LIBRE;
}
