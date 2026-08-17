/**
 * Un formulario que se contesta de a una pregunta.
 *
 * Nació dentro de Child-Pugh, donde los cinco criterios abiertos de entrada
 * eran tres pantallas de scroll antes de contestar nada. Nada de esa lógica es
 * hepática: es **una lista de preguntas y un predicado de «contestada»**, así
 * que vive acá y la usan todas las calculadoras que se llenan en cascada.
 *
 * Se extrajo al llegar la segunda —edad vascular—, que es lo que justifica la
 * abstracción. Con una sola habría sido adivinar qué parte era general.
 *
 * Las tres reglas que la definen:
 *
 *   1. Se abre la primera sin contestar, salvo que el médico haya tocado una ya
 *      contestada para corregirla — ésa gana siempre.
 *   2. Corregir una del medio abre ESA y ninguna más: las de abajo se quedan
 *      como estaban.
 *   3. Lo contestado se pliega. Si se quedara como tarjeta, a la quinta hay
 *      cinco tarjetas y volvimos al scroll.
 */

/**
 * Cuál se muestra abierta.
 *
 * `null` con todas contestadas: ahí no hay nada abierto y se ven los renglones
 * plegados.
 */
export function preguntaAbierta<C extends string>(
  preguntas: readonly C[],
  contestada: (c: C) => boolean,
  abiertaAMano: C | null,
): C | null {
  if (abiertaAMano !== null) return abiertaAMano;
  return preguntas.find((c) => !contestada(c)) ?? null;
}

/**
 * La que se muestra apagada abajo de la abierta, como anticipo.
 *
 * Sólo mientras se está completando hacia adelante: corrigiendo una del medio,
 * el anticipo diría que falta algo que ya está contestado.
 */
export function preguntaSiguiente<C extends string>(
  preguntas: readonly C[],
  contestada: (c: C) => boolean,
  abierta: C | null,
): C | null {
  if (abierta === null) return null;
  const desde = preguntas.indexOf(abierta) + 1;
  return preguntas.slice(desde).find((c) => !contestada(c)) ?? null;
}

/** Cuántas contestadas, para el «3 de 5» y su barra. */
export function cuantasContestadas<C extends string>(
  preguntas: readonly C[],
  contestada: (c: C) => boolean,
): number {
  return preguntas.filter(contestada).length;
}
