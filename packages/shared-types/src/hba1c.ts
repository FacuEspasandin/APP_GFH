/**
 * HbA1c → glucemia promedio estimada (eAG) — estudio ADAG (Nathan et al.,
 * 2008), la única fórmula en uso, adoptada globalmente por ADA/EASD/IDF desde
 * 2008 sin recalibración regional ni versión alternativa por país.
 *
 * Dominio puro, mismo criterio que `clcr.ts` e `imc.ts`.
 */

import { RANGOS, type Rango } from './rangos';
import { DatoClinicoInvalido } from './clcr';

function validar(hba1cPorcentaje: number): void {
  const { min, max } = RANGOS.hba1cPorcentaje as Rango;
  if (!Number.isFinite(hba1cPorcentaje)) {
    throw new DatoClinicoInvalido('hba1cPorcentaje', hba1cPorcentaje, 'no es un número finito');
  }
  if (hba1cPorcentaje < min) {
    throw new DatoClinicoInvalido('hba1cPorcentaje', hba1cPorcentaje, `debe ser mayor o igual a ${min}`);
  }
  if (hba1cPorcentaje > max) {
    throw new DatoClinicoInvalido('hba1cPorcentaje', hba1cPorcentaje, `debe ser menor o igual a ${max}`);
  }
}

export interface EagEstimada {
  mgDl: number;
  mmolL: number;
}

/**
 * eAG(mg/dl) = 28,7 × HbA1c(%) − 46,7
 * eAG(mmol/l) = 1,59 × HbA1c(%) − 2,59
 *
 * mg/dl redondeado a entero (así se lee un glucómetro); mmol/l a 1 decimal.
 */
export function calcularEag(hba1cPorcentaje: number): EagEstimada {
  validar(hba1cPorcentaje);

  return {
    mgDl: Math.round(28.7 * hba1cPorcentaje - 46.7),
    mmolL: Math.round((1.59 * hba1cPorcentaje - 2.59) * 10) / 10,
  };
}
