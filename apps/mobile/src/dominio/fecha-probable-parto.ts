/**
 * Fecha probable de parto (regla de Naegele), fuera del molde a propósito.
 *
 * Las demás calculadoras piden números o criterios que se eligen; ésta pide
 * una fecha, y el molde genérico (`CampoNumero`/`CampoOpcion`) no tiene un
 * tercer tipo para eso. Es una sola pantalla con un dato de entrada — no
 * amerita sumar un `CampoFecha` al sistema genérico por una calculadora.
 *
 * No toca `semanaGestacion` del paciente (ver `gestacion.ts`): ese campo es
 * deliberadamente un número que el médico escribe directo, no algo derivado
 * de una FUM. Esta herramienta es standalone y no guarda nada, mismo
 * criterio que el resto de "Herramientas".
 */

const DIAS_GESTACION = 280; // 40 semanas, regla de Naegele

/** FUM + 280 días. */
export function fechaProbableDeParto(fum: Date): Date {
  const fpp = new Date(fum.getTime());
  fpp.setUTCDate(fpp.getUTCDate() + DIAS_GESTACION);
  return fpp;
}

/**
 * Semanas transcurridas desde la FUM hasta hoy. `null` si la FUM es futura
 * — no hay gestación negativa.
 */
export function semanasDesdeFum(fum: Date, hoy: Date): number | null {
  const dias = Math.floor((hoy.getTime() - fum.getTime()) / 86_400_000);
  if (dias < 0) return null;
  return Math.floor(dias / 7);
}
