import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * HOMA-IR, declarada contra el molde.
 *
 * `modo: 'corrido'`, dos números. Sin banda a propósito — a diferencia de
 * Anion Gap/gap osmolar, acá la FÓRMULA es universal pero el CORTE de
 * "resistencia a la insulina" sí varía por población de referencia del
 * estudio (a diferencia de lo que se verificó para CHA2DS2-VASc/Wells, éste
 * es justo el caso donde la escala numérica es fija pero la interpretación
 * no lo es) — se muestra el índice solo, sin clasificarlo.
 */
export function moldeHomaIr(): Molde {
  return {
    clave: 'homa-ir',
    titulo: 'HOMA-IR',
    formula: 'HOMA-IR = (Glucosa × Insulina) / 405',
    modo: 'corrido',
    campos: [
      {
        tipo: 'numero',
        clave: 'glucosaMgDl',
        rotulo: 'Glucosa en ayunas',
        unidad: 'mg/dL',
        rango: RANGOS.glucosaMgDl,
      },
      {
        tipo: 'numero',
        clave: 'insulinaUUmL',
        rotulo: 'Insulina en ayunas',
        unidad: 'µU/mL',
        rango: RANGOS.insulinaUUmL,
      },
    ],
    resultado: {
      tipo: 'cifras',
      cifras: [{ clave: 'homaIr', rotulo: 'HOMA-IR', unidad: 'índice' }],
    },
    limite:
      'No clasifica riesgo: el corte de resistencia a la insulina (valores ≈2,5-3 aparecen seguido ' +
      'en la bibliografía) varía según la población de referencia del estudio. Constante /405 para ' +
      'glucosa en mg/dL — con mmol/L sería /22,5.',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularHomaIrParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const glucosa = num(b.glucosaMgDl);
  const insulina = num(b.insulinaUUmL);

  if (glucosa === undefined || insulina === undefined) {
    return { homaIr: { valor: null } };
  }

  const homaIr = (glucosa * insulina) / 405;
  return { homaIr: { valor: Math.round(homaIr * 100) / 100 } };
}
