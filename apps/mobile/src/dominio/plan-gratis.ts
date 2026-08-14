/**
 * Qué puede hacer el médico con el plan gratis, y qué le mostramos antes de que
 * lo intente.
 *
 * La frontera es **cruzar**. Calcular no se cobra —un clearance o un Child-Pugh
 * son fórmulas publicadas—; lo que es nuestro es cruzar un fármaco contra otro,
 * contra una condición, contra un embarazo o contra un riñón concreto. Eso,
 * multiplicado por un paciente entero, es el producto.
 *
 * El muro real vive en el servidor. Esto sólo decide qué se ofrece: mandar al
 * médico a una pantalla para que rebote con un 403 lo castiga por haber tocado
 * algo, y no ofrecer nada esconde lo que estamos vendiendo.
 */

export interface CupoConsultas {
  usadas: number;
  total: number;
  restantes: number;
  /** El backend decide desde cuándo se muestra: antes es ruido, después aviso. */
  avisar: boolean;
}

export interface EstadoDelPlan {
  vigente: boolean;
  pacientes: number;
  limitePacientes: number | null;
  puedeCrearPaciente: boolean;
  /** `null` con suscripción vigente: no hay nada que contar. */
  consultas: CupoConsultas | null;
}

export type Decision = 'formulario' | 'paywall' | 'esperar';

/**
 * Por qué se abrió el paywall. Cambia el texto, no el precio.
 *
 * Son tres situaciones distintas y mezclarlas se nota: al que gastó sus diez
 * consultas decirle "creá tu primer paciente" le habla de otra cosa que la que
 * estaba haciendo.
 */
export type MotivoPaywall = 'paciente' | 'consultas' | 'herramienta' | 'grupo';

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

/** A dónde manda "Nuevo paciente". */
export function rutaNuevoPaciente(plan: EstadoDelPlan | undefined): string {
  return plan !== undefined && !plan.puedeCrearPaciente
    ? rutaPaywall('paciente')
    : '/crear-paciente';
}

export function rutaPaywall(motivo: MotivoPaywall): string {
  return `/paywall?motivo=${motivo}`;
}

/** Con suscripción no hay nada bloqueado; sin ella, todo lo que toca a un
 *  paciente propio o cruza fármacos sin paciente. */
export function esDePago(plan: EstadoDelPlan | undefined): boolean {
  return plan !== undefined && !plan.vigente;
}

// --- las herramientas sueltas ------------------------------------------------

/**
 * Lo único que este módulo necesita saber de una herramienta.
 *
 * El catálogo entero —títulos, íconos, categorías— vive en `herramientas.ts`.
 * Acá sólo importa si cruza el catálogo, que es lo que decide el precio.
 */
interface Cobrable {
  ruta: string;
  cruza: boolean;
}

/** A dónde lleva tocar una herramienta. Las pagas se ven igual: esconderlas
 *  esconde el producto, y el médico no puede querer lo que no sabe que existe. */
export function rutaHerramienta(h: Cobrable, plan: EstadoDelPlan | undefined): string {
  return h.cruza && esDePago(plan) ? rutaPaywall('herramienta') : h.ruta;
}

// --- el cupo de consultas ----------------------------------------------------

/**
 * El renglón del contador, o `null` cuando no corresponde mostrarlo.
 *
 * No se muestra desde la primera porque un contador en 1/10 convierte una
 * consulta en una transacción. Aparece cuando queda poco, que es cuando el dato
 * sirve para decidir.
 */
export function textoCupo(plan: EstadoDelPlan | undefined): string | null {
  const c = plan?.consultas;
  if (!c || !c.avisar) return null;
  if (c.restantes === 0) return 'Usaste tus consultas gratis';
  return `Te ${c.restantes === 1 ? 'queda' : 'quedan'} ${c.restantes} de ${c.total} consultas`;
}

/** Si entrar a una restricción va a chocar contra el muro. */
export function cupoAgotado(plan: EstadoDelPlan | undefined): boolean {
  const c = plan?.consultas;
  return c !== null && c !== undefined && c.restantes === 0;
}

/**
 * Si ENTRAR a esta restricción va a gastar una consulta.
 *
 * `yaVistas` son los pares (producto, herramienta) que este médico ya abrió: el
 * backend no las vuelve a cobrar, así que la app tampoco tiene que advertir.
 */
export function gastaConsulta(
  plan: EstadoDelPlan | undefined,
  clave: string,
  yaVistas: readonly string[],
): boolean {
  return esDePago(plan) && !yaVistas.includes(clave);
}
