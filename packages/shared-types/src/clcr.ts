import { RANGOS, type Rango } from './rangos';
import type { Sexo } from './sexo';

/**
 * Función renal — Cockcroft-Gault. Motor §4.1-4.2.
 *
 * Dominio puro: sin Prisma, sin I/O, sin fechas implícitas. `hoy` se pasa como
 * argumento porque una edad que cambia sola vuelve los tests irreproducibles.
 *
 * Vive en el paquete compartido y no en el backend porque la app lo necesita
 * para mostrar el Clcr mientras el médico escribe peso y creatinina. Dos copias
 * de esta fórmula serían dos números distintos para el mismo paciente el día
 * que una se toque y la otra no.
 */

export interface EntradaCockcroftGault {
  edadAnios: number;
  pesoKg: number;
  creatininaMgDl: number;
  sexo: Sexo;
}

export class DatoClinicoInvalido extends Error {
  constructor(readonly campo: string, readonly valor: number, readonly motivo: string) {
    super(`${campo} = ${valor}: ${motivo}`);
    this.name = 'DatoClinicoInvalido';
  }
}

/**
 * Los rangos salen de `rangos.ts`, que es la única tabla.
 *
 * Estaban acá y repetidos en los `@Min/@Max` de los DTO, y ya habían
 * divergido: el motor pedía peso mayor a 0 y el DTO mayor o igual a 0,1.
 *
 * Los dos endurecimientos siguen siendo DELIBERADOS y viven allá: el documento
 * §4.1 admite `peso 0-500` y `creatinina 0-30`, pero el 0 no sirve en ninguno
 * de los dos —con creatinina 0 la fórmula divide por cero y devuelve Infinity,
 * y con peso 0 devuelve un Clcr de 0 que caería en el peor tramo de la tabla
 * como si fuera un dato real—. Ninguno existe en un paciente.
 */
type CampoClcr = 'edadAnios' | 'pesoKg' | 'creatininaMgDl';

function validar(campo: CampoClcr, valor: number): void {
  // `RANGOS` es un `as const`, así que la unión no declara `minExclusivo` en
  // las entradas que no lo tienen. Se lee como `Rango`, que sí lo tiene opcional.
  const { min, max, minExclusivo } = RANGOS[campo] as Rango;
  if (!Number.isFinite(valor)) {
    throw new DatoClinicoInvalido(campo, valor, 'no es un número finito');
  }
  if (minExclusivo ? valor <= min : valor < min) {
    throw new DatoClinicoInvalido(campo, valor, `debe ser mayor ${minExclusivo ? 'a' : 'o igual a'} ${min}`);
  }
  if (valor > max) {
    throw new DatoClinicoInvalido(campo, valor, `debe ser menor o igual a ${max}`);
  }
}

/**
 * Clcr = ((140 − edad) × peso) / (72 × creatinina) × factorSexo
 *
 * `OTRO` usa factor 1.0: la fórmula solo contempla dos categorías y no hay una
 * respuesta clínica mejor. Documentarlo es preferible a inventarla.
 *
 * El resultado se redondea a 1 decimal y nunca es negativo — con edad > 140 el
 * numerador da negativo, y un Clcr negativo no significa nada.
 */
export function calcularClcr(e: EntradaCockcroftGault): number {
  validar('edadAnios', e.edadAnios);
  validar('pesoKg', e.pesoKg);
  validar('creatininaMgDl', e.creatininaMgDl);

  const factorSexo = e.sexo === 'F' ? 0.85 : 1.0;
  const bruto = ((140 - e.edadAnios) * e.pesoKg) / (72 * e.creatininaMgDl) * factorSexo;

  return Math.max(0, Math.round(bruto * 10) / 10);
}

/** Edad en años cumplidos. `hoy` explícito para que los tests no dependan del
 *  reloj y para que "cumple años mañana" no se redondee para arriba. */
export function edadEnAnios(fechaNacimiento: Date, hoy: Date): number {
  let edad = hoy.getUTCFullYear() - fechaNacimiento.getUTCFullYear();
  const mes = hoy.getUTCMonth() - fechaNacimiento.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < fechaNacimiento.getUTCDate())) {
    edad -= 1;
  }
  return edad;
}
