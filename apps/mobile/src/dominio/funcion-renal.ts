import { calcularClcr, DatoClinicoInvalido, type RangoGravedad, type Sexo } from '@gfh/shared-types';

/**
 * Lo que la pantalla de función renal calcula y dice.
 *
 * Todo el peso está en no afirmar de más: un Clcr a medio escribir no es un
 * error, y un cambio que no cruza un umbral de la tabla no cambia nada.
 */

/** Los mismos cortes que usa `claveColorPorClcr` para pintar el número. */
export function tramoClcr(clcr: number): 'grave' | 'medio' | 'normal' {
  if (clcr < 30) return 'grave';
  if (clcr < 60) return 'medio';
  return 'normal';
}

/** La gravedad del Clcr en sí, para teñir el veredicto de la herramienta. */
export function rangoDelClcr(clcr: number): RangoGravedad {
  const t = tramoClcr(clcr);
  return t === 'grave' ? 1 : t === 'medio' ? 2 : 3;
}

/**
 * `null` cuando todavía no alcanza para calcular.
 *
 * Mientras se tipea "1" camino a "1,4" el valor pasa por estados imposibles y
 * `calcularClcr` los rechaza. Un error en cada tecla sería ruido: se muestra el
 * resultado recién cuando existe.
 */
export function calcularSiSePuede(
  edadAnios: number,
  pesoKg: number | undefined,
  creatininaMgDl: number | undefined,
  sexo: Sexo,
): number | null {
  if (pesoKg === undefined || creatininaMgDl === undefined) return null;
  try {
    return calcularClcr({ edadAnios, pesoKg, creatininaMgDl, sexo });
  } catch (e) {
    if (e instanceof DatoClinicoInvalido) return null;
    throw e;
  }
}

/** Qué significa el cambio que se está por guardar. */
export function leyendaDelCambio(
  antes: number | null,
  despues: number,
  manual: boolean,
): string {
  const sufijo = manual ? ' Queda marcado como ingresado a mano.' : '';

  if (antes === null) return `Pasa a tener Clcr.${sufijo}`;
  if (tramoClcr(antes) === tramoClcr(despues)) {
    return tramoClcr(despues) === 'grave'
      ? `Sigue bajo 30: el ajuste renal se mantiene.${sufijo}`
      : `Se mantiene en el mismo tramo de la tabla.${sufijo}`;
  }
  return `Cambia de tramo: los ajustes se recalculan.${sufijo}`;
}

export interface DatosDeProcedencia {
  clcrOrigen: string | null;
  clcrMedidoAt: string | null;
  pesoKg: number | null;
  creatininaMgDl: number | null;
}

/**
 * De dónde salió el número que se está por pisar.
 *
 * Importa clínicamente: un valor medido y uno estimado por Cockcroft-Gault no
 * se leen igual, y el segundo depende de un peso que puede estar viejo.
 */
export function procedenciaClcr(p: DatosDeProcedencia, formatearFecha: (iso: string) => string): string {
  const calculado = p.clcrOrigen === 'CALCULADO_COCKCROFT';
  const cuando = p.clcrMedidoAt ? formatearFecha(p.clcrMedidoAt) : null;

  if (!calculado) {
    return cuando ? `Ingresado a mano el ${cuando}.` : 'Ingresado a mano.';
  }

  const con = [
    p.pesoKg !== null ? `${p.pesoKg} kg` : null,
    p.creatininaMgDl !== null ? `creatinina ${String(p.creatininaMgDl).replace('.', ',')}` : null,
  ].filter(Boolean);

  return (
    (cuando ? `Calculado el ${cuando} por Cockcroft-Gault` : 'Calculado por Cockcroft-Gault') +
    (con.length > 0 ? `, con ${con.join(' y ')}.` : '.')
  );
}
