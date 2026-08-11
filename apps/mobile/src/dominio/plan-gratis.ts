/**
 * Cuándo se muestra el formulario de crear paciente y cuándo el paywall.
 *
 * La frontera del plan gratis es el PACIENTE, no la cantidad de fármacos: es
 * lo único que un buscador de fármacos no puede tener sin convertirse en otro
 * producto. Acá se decide qué ve el médico antes de escribir nada.
 */

export interface EstadoDelPlan {
  vigente: boolean;
  pacientes: number;
  limitePacientes: number | null;
  puedeCrearPaciente: boolean;
}

export type Decision = 'formulario' | 'paywall' | 'esperar';

/**
 * `plan` sin definir mientras la consulta viaja; `fallo` cuando no llegó.
 *
 * Si la consulta falla se deja pasar: el límite lo aplica el backend igual, y
 * trabar por un dato de facturación que no llegó sería inventar un muro que
 * quizá no existe. Esperar en cambio evita que el formulario aparezca y
 * desaparezca medio segundo después.
 */
export function decidirEntrada(plan: EstadoDelPlan | undefined, fallo: boolean): Decision {
  if (plan === undefined) return fallo ? 'formulario' : 'esperar';
  return plan.puedeCrearPaciente ? 'formulario' : 'paywall';
}

/** El texto del acceso, cuando conviene decir por qué lleva al paywall. */
export function detalleDeAcceso(plan: EstadoDelPlan | undefined): string | undefined {
  if (plan === undefined || plan.puedeCrearPaciente) return undefined;
  return 'Incluido en la suscripción';
}

/** A dónde manda "Nuevo paciente". Con el plan lleno, directo al paywall: el
 *  formulario también se protege solo, pero mandar ahí para que rebote muestra
 *  medio segundo una pantalla que no se iba a poder usar. */
export function rutaNuevoPaciente(plan: EstadoDelPlan | undefined): string {
  return plan !== undefined && !plan.puedeCrearPaciente ? '/paywall' : '/crear-paciente';
}
