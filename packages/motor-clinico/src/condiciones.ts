/**
 * Alertas condición-fármaco. Motor §6.
 *
 * Dos mecanismos que parecen features y son la misma tabla: las condiciones
 * SINTÉTICAS y las ventanas de gestación. Ninguno de los dos agrega un motor
 * nuevo — se resuelven antes de cruzar, o dentro del filtro.
 */

export type SeveridadAlerta = 'INFO' | 'PRECAUCION' | 'EVITAR' | 'CONTRAINDICADO';

/** Códigos reservados. Se derivan en cada evaluación y NUNCA son filas de
 *  `CondicionPaciente`. */
export const CODIGO_ADULTO_MAYOR = 'ADULTO_MAYOR';
export const CODIGO_EMBARAZO = 'EMBARAZO';
export const CODIGO_LACTANCIA = 'LACTANCIA';

export const UMBRAL_ADULTO_MAYOR_DEFAULT = 65;

export interface DatosSinteticos {
  edadAnios: number | null;
  semanaGestacion: number | null;
  /** `true` con semana desconocida sigue siendo embarazo: la alerta se mantiene. */
  embarazada: boolean;
  estaLactando: boolean | null;
  umbralAdultoMayor?: number;
}

/**
 * Agrega las condiciones derivadas a las que el médico cargó a mano.
 *
 * Por qué sintéticas y no filas: una fila de "adulto mayor" envejecería mal —el
 * paciente cumple años y nadie la actualiza— y además nadie tiene que
 * "diagnosticar" la edad. El umbral es configurable porque en una consulta de
 * geriatría todos los pacientes lo superan y la alerta se vuelve ruido.
 */
export function condicionesEfectivas(
  codigosCargados: readonly string[],
  datos: DatosSinteticos,
): string[] {
  const codigos = new Set(codigosCargados);
  const umbral = datos.umbralAdultoMayor ?? UMBRAL_ADULTO_MAYOR_DEFAULT;

  if (datos.edadAnios !== null && datos.edadAnios >= umbral) {
    codigos.add(CODIGO_ADULTO_MAYOR);
  }
  if (datos.embarazada || datos.semanaGestacion !== null) {
    codigos.add(CODIGO_EMBARAZO);
  }
  if (datos.estaLactando === true) {
    codigos.add(CODIGO_LACTANCIA);
  }

  return [...codigos];
}

/**
 * Ventana de gestación — motor §6.3.
 *
 * El riesgo depende del momento, no solo del hecho de estar embarazada: un AINE
 * se evita antes de la semana 20 y pasa a contraindicado desde ahí. Por eso un
 * mismo par (fármaco, condición) puede tener varias filas. En el catálogo real
 * hay 38 alertas con ventana, repartidas en 18 pares.
 *
 * LA LÍNEA QUE IMPORTA: sin semana registrada, la alerta SE MANTIENE. Si no
 * sabemos en qué semana está, no se puede descartar el riesgo. Nunca se oculta
 * una alerta por falta de datos.
 */
export function aplicaEnSemana(
  semanaMin: number | null,
  semanaMax: number | null,
  semanaActual: number | null,
): boolean {
  if (semanaMin === null && semanaMax === null) return true; // toda la gestación
  if (semanaActual === null) return true; // ← conservador a propósito
  if (semanaMin !== null && semanaActual < semanaMin) return false;
  if (semanaMax !== null && semanaActual > semanaMax) return false;
  return true;
}

/** Para que la UI pueda pedir el dato: "hay alertas que dependen de la semana
 *  de gestación y no está registrada". */
export function hayAlertasSinAfinarPorSemana(
  alertas: ReadonlyArray<{ semanaMin: number | null; semanaMax: number | null }>,
  semanaActual: number | null,
): boolean {
  return semanaActual === null && alertas.some((a) => a.semanaMin !== null || a.semanaMax !== null);
}
