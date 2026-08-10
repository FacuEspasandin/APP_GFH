/**
 * Qué entra en el plan gratis.
 *
 * La frontera NO es la cantidad de fármacos que se pueden cruzar: ese es el
 * terreno de los vademécums gratuitos, donde competimos en desventaja. Es el
 * **paciente** — lo único que un buscador de fármacos no puede tener sin
 * convertirse en otro producto.
 *
 * Por eso las herramientas standalone y el buscador quedan completos y sin
 * límite, y lo que se paga es seguir pacientes. Encaja con una decisión que ya
 * estaba tomada: las herramientas son descartables a propósito, sin historial.
 *
 * Un paciente y no cero: si el médico nunca llega a ver el cockpit, nos evalúa
 * como un buscador de fármacos peor que los que ya usa. Cargando a su paciente
 * más complicado ve las cinco verificaciones cruzadas de una sola vez, que es
 * el argumento entero del producto. El muro llega cuando quiere el segundo —
 * o sea, cuando ya lo quiere usar en serio.
 */

export const PLAN_GRATIS = {
  /** Pacientes que puede tener un médico sin suscripción. */
  pacientes: 1,
} as const;

/** Código que devuelve la API al chocar contra el límite del plan gratis.
 *
 *  Distinto de `SUSCRIPCION_VENCIDA` a propósito: la app tiene que abrir el
 *  paywall —"esto se desbloquea pagando"— y no la pantalla de bloqueo, que
 *  dice algo bien distinto ("perdiste el acceso"). */
export const CODIGO_LIMITE_PLAN_GRATIS = 'LIMITE_PLAN_GRATIS';
