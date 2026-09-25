import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Sodio corregido por hiperglucemia, declarada contra el molde.
 *
 * `modo: 'corrido'`, dos números. Sin banda, mismo criterio que calcio
 * corregido: es un insumo para no diagnosticar una hiponatremia que en
 * realidad es dilucional por la glucemia alta, no una escala propia.
 *
 * Factor de Katz (1,6) — el más enseñado. Algunas guías usan el factor de
 * Hillier (2,4) con glucosa muy alta; queda anotado en `limite`, no
 * implementado como variante para no duplicar la decisión clínica.
 */
export function moldeSodioCorregido(): Molde {
  return {
    clave: 'sodio-corregido',
    titulo: 'Sodio corregido',
    formula: 'Corregido = Sodio + 1,6 × ((Glucosa − 100) / 100)',
    modo: 'corrido',
    campos: [
      { tipo: 'numero', clave: 'sodioMeqL', rotulo: 'Sodio medido', unidad: 'mEq/L', rango: RANGOS.sodioMeqL },
      { tipo: 'numero', clave: 'glucosaMgDl', rotulo: 'Glucosa', unidad: 'mg/dL', rango: RANGOS.glucosaMgDl },
    ],
    resultado: {
      tipo: 'cifras',
      cifras: [{ clave: 'sodioCorregidoMeqL', rotulo: 'Sodio corregido', unidad: 'mEq/L' }],
    },
    limite:
      'No clasifica riesgo: la interpretación depende del cuadro clínico completo. Usa el factor ' +
      'de Katz (1,6) — con glucosa muy alta, algunas guías prefieren el factor de Hillier (2,4).',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularSodioCorregidoParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const sodio = num(b.sodioMeqL);
  const glucosa = num(b.glucosaMgDl);

  if (sodio === undefined || glucosa === undefined) {
    return { sodioCorregidoMeqL: { valor: null } };
  }

  const corregido = sodio + 1.6 * ((glucosa - 100) / 100);
  return { sodioCorregidoMeqL: { valor: Math.round(corregido) } };
}
