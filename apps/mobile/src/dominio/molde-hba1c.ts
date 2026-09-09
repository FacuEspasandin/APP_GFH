import {
  calcularEag,
  DatoClinicoInvalido,
  RANGOS,
  type Borrador,
  type Molde,
  type Unidades,
} from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * HbA1c → glucemia promedio estimada, declarada contra el molde.
 *
 * `modo: 'corrido'`: un solo número que se escribe. `resultado.tipo:
 * 'cifras'` y no un tramo: la ADAG no clasifica en bandas, traduce una
 * unidad a otra — dos lecturas del mismo resultado, no una escala.
 */
export function moldeHba1c(): Molde {
  return {
    clave: 'hba1c',
    titulo: 'HbA1c → glucemia promedio',
    formula: 'eAG(mg/dl) = 28,7 × HbA1c(%) − 46,7. Estudio ADAG (2008).',
    modo: 'corrido',
    campos: [
      {
        tipo: 'numero',
        clave: 'hba1cPorcentaje',
        rotulo: 'Hemoglobina glicosilada',
        unidad: '%',
        rango: RANGOS.hba1cPorcentaje,
      },
    ],
    resultado: {
      tipo: 'cifras',
      cifras: [
        { clave: 'mgDl', rotulo: 'Glucemia promedio estimada', unidad: 'mg/dl' },
        { clave: 'mmolL', rotulo: 'Glucemia promedio estimada', unidad: 'mmol/l' },
      ],
    },
    limite:
      'No es válida con anemia, hemoglobinopatías, embarazo o enfermedad ' +
      'renal crónica avanzada — cualquier cosa que altere el recambio de ' +
      'glóbulos rojos invalida la relación entre HbA1c y glucemia.',
  };
}

/** Vacío o texto que no es número es «sin cargar», no cero. */
function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularHba1cParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const hba1cPorcentaje = num(b.hba1cPorcentaje);

  if (hba1cPorcentaje === undefined) {
    return { mgDl: { valor: null }, mmolL: { valor: null } };
  }

  try {
    const eag = calcularEag(hba1cPorcentaje);
    return { mgDl: { valor: eag.mgDl }, mmolL: { valor: eag.mmolL } };
  } catch (e) {
    if (e instanceof DatoClinicoInvalido) return { mgDl: { valor: null }, mmolL: { valor: null } };
    throw e;
  }
}
