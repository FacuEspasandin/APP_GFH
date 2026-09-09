/**
 * Índice de masa corporal — clasificación de la OMS.
 *
 * Dominio puro, mismo criterio que `clcr.ts`: la app lo necesita mientras el
 * médico escribe peso y talla, sin ida y vuelta al backend. Fórmula sin
 * variante regional real — la OMS sugiere cortes más bajos para población
 * asiática (sobrepeso ≥23, obesidad ≥25), pero no aplica a la población
 * objetivo de esta app y queda fuera a propósito (ver `molde-imc.ts`).
 */

import { RANGOS, type Rango } from './rangos';
import { DatoClinicoInvalido } from './clcr';

type CampoImc = 'pesoKg' | 'alturaCm';

function validar(campo: CampoImc, valor: number): void {
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

/** IMC = peso(kg) / talla(m)². Redondeado a 1 decimal. */
export function calcularImc(pesoKg: number, alturaCm: number): number {
  validar('pesoKg', pesoKg);
  validar('alturaCm', alturaCm);

  const alturaM = alturaCm / 100;
  return Math.round((pesoKg / (alturaM * alturaM)) * 10) / 10;
}
