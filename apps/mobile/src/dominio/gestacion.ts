/**
 * Embarazo y lactancia: qué se puede decir de cada dato y qué cambia.
 *
 * Las dos son verificaciones del motor que hasta ahora no tenían pantalla. Lo
 * delicado no es el formulario: es no afirmar de más. "Sin dato" y "no" son
 * cosas distintas, y el sistema sólo puede guardar una de las dos.
 */

/** Lactancia tiene tres estados de verdad: la columna es `Boolean?`. */
export type EstadoLactancia = 'sin-dato' | 'no' | 'si';

export function estadoLactancia(valor: boolean | null | undefined): EstadoLactancia {
  if (valor === true) return 'si';
  if (valor === false) return 'no';
  return 'sin-dato';
}

/** `null` limpia el dato; el backend lo distingue de `false`. */
export function valorLactancia(estado: EstadoLactancia): boolean | null {
  if (estado === 'si') return true;
  if (estado === 'no') return false;
  return null;
}

/**
 * Embarazo, en cambio, tiene DOS estados representables.
 *
 * El modelo guarda `semanaGestacion: Int?` y nada más: no existe una columna
 * para "no está embarazada". Sin semana, el motor simplemente no evalúa
 * embarazo — que es lo mismo que haría con un "no" explícito. Ofrecer tres
 * botones sería teatro: dos de ellos guardarían exactamente lo mismo.
 */
export type EstadoEmbarazo = 'sin-dato' | 'si';

export function estadoEmbarazo(semana: number | null | undefined): EstadoEmbarazo {
  return semana === null || semana === undefined ? 'sin-dato' : 'si';
}

/** Los límites del DTO del backend (`@Min(1) @Max(45)`). */
export const SEMANA_MIN = 1;
export const SEMANA_MAX = 45;

export function semanaValida(n: number | undefined): boolean {
  return n !== undefined && Number.isInteger(n) && n >= SEMANA_MIN && n <= SEMANA_MAX;
}

/**
 * Trimestre obstétrico estándar: 1º hasta la 13, 2º de la 14 a la 27, 3º desde
 * la 28.
 *
 * Los cortes de las alertas del catálogo NO son estos —van por 12/13 y 19/20—
 * así que el trimestre se muestra para ubicar al médico, no para prometer qué
 * alertas se aplican. Eso lo decide el motor.
 */
export function trimestre(semana: number): 1 | 2 | 3 {
  if (semana <= 13) return 1;
  if (semana <= 27) return 2;
  return 3;
}

const NOMBRE_TRIMESTRE: Record<1 | 2 | 3, string> = {
  1: 'Primer trimestre',
  2: 'Segundo trimestre',
  3: 'Tercer trimestre',
};

export function nombreTrimestre(semana: number): string {
  return NOMBRE_TRIMESTRE[trimestre(semana)];
}

/** El chip del cockpit: la semana viaja con la condición cuando existe. */
export function etiquetaEmbarazo(semana: number | null): string {
  return semana === null ? 'Embarazo' : `Embarazo · ${semana} sem`;
}

/**
 * Qué se manda al backend.
 *
 * `null` limpia; omitir dejaría el valor viejo, que es justo lo que no se
 * quiere cuando el médico eligió "sin dato".
 */
export function cuerpoDeGuardado(
  embarazo: EstadoEmbarazo,
  semana: number | undefined,
  lactancia: EstadoLactancia,
): { semanaGestacion: number | null; estaLactando: boolean | null } {
  return {
    semanaGestacion: embarazo === 'si' && semanaValida(semana) ? semana! : null,
    estaLactando: valorLactancia(lactancia),
  };
}

/** Con embarazo marcado hay que poner una semana válida para poder guardar. */
export function sePuedeGuardar(embarazo: EstadoEmbarazo, semana: number | undefined): boolean {
  return embarazo === 'sin-dato' || semanaValida(semana);
}
