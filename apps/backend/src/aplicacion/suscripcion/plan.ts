/**
 * Qué entra en el plan gratis.
 *
 * La frontera es **cruzar**. Calcular no se cobra: un clearance o un Child-Pugh
 * son fórmulas publicadas y cobrarlas nos pondría a competir con cualquier
 * calculadora web. Lo que sí es nuestro es cruzar un fármaco contra otro,
 * contra una condición, contra un embarazo o contra un riñón concreto — y eso,
 * multiplicado por un paciente entero, es el producto.
 *
 * Por eso el reparto quedó así:
 *
 *   Gratis, sin tope   calculadoras de Clcr y Child-Pugh; buscador; la ficha
 *                      técnica de cualquier fármaco (composición, presentación,
 *                      familia alergénica); mirar el paciente de demostración.
 *
 *   Gratis, diez veces las restricciones de un fármaco — interacciones, ajuste
 *                      renal y hepático, embarazo y lactancia.
 *
 *   Con suscripción    todo lo que toque a un paciente propio, y las
 *                      herramientas que cruzan sin paciente.
 *
 * El paciente de demostración existe porque un muro sin escaparate no vende:
 * el médico tiene que ver las cinco verificaciones corriendo sobre alguien
 * antes de que le pidan la tarjeta.
 */

export const PLAN_GRATIS = {
  /**
   * Pacientes propios que puede tener un médico sin suscripción.
   *
   * Cero, no uno. El de demostración no cuenta porque no es suyo: no está en la
   * base, no se puede editar y es el mismo para todos.
   */
  pacientes: 0,

  /**
   * Consultas de restricción incluidas, **de por vida**.
   *
   * No se reponen. La cuenta es por par (producto, herramienta): volver a
   * entrar a lo mismo no descuenta otra vez, porque si no ir y volver quemaría
   * el cupo y el límite se sentiría tramposo.
   */
  consultasRestriccion: 10,

  /** A partir de cuántas usadas se le muestra el contador al médico.
   *
   *  Antes de la sexta es ruido; después es un aviso. Como el cupo no se
   *  repone, chocar contra el muro sin haberlo visto venir se lee como una
   *  trampa. */
  avisarDesde: 6,
} as const;

/** Código que devuelve la API al chocar contra el límite del plan gratis.
 *
 *  Distinto de `SUSCRIPCION_VENCIDA` a propósito: la app tiene que abrir el
 *  paywall —"esto se desbloquea pagando"— y no la pantalla de bloqueo, que
 *  dice algo bien distinto ("perdiste el acceso"). */
export const CODIGO_LIMITE_PLAN_GRATIS = 'LIMITE_PLAN_GRATIS';

/** El cupo de consultas se agotó. La app abre el paywall del contador, que
 *  dice algo distinto del de «esto es de pago»: acá hubo algo gratis y se
 *  terminó. */
export const CODIGO_SIN_CONSULTAS = 'SIN_CONSULTAS_GRATIS';
