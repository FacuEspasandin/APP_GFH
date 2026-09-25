import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Calcio corregido por albúmina, declarada contra el molde.
 *
 * `modo: 'corrido'`, dos números. `resultado.tipo: 'cifras'`, sin banda de
 * color a propósito: el rango de referencia del calcio varía por
 * laboratorio, y no hay una tabla del catálogo que lo fije — mismo criterio
 * que peso ideal y superficie corporal, ver el comentario de `rangos.ts`
 * sobre por qué los rangos de referencia clínica quedan afuera.
 */
export function moldeCalcioCorregido(): Molde {
  return {
    clave: 'calcio-corregido',
    titulo: 'Calcio corregido',
    formula: 'Corregido = Calcio + 0,8 × (4,0 − Albúmina)',
    modo: 'corrido',
    campos: [
      { tipo: 'numero', clave: 'calcioMgDl', rotulo: 'Calcio total', unidad: 'mg/dL', rango: RANGOS.calcioMgDl },
      { tipo: 'numero', clave: 'albuminaGDl', rotulo: 'Albúmina', unidad: 'g/dL', rango: RANGOS.albuminaGDl },
    ],
    resultado: {
      tipo: 'cifras',
      cifras: [{ clave: 'calcioCorregidoMgDl', rotulo: 'Calcio corregido', unidad: 'mg/dL' }],
    },
    limite:
      'No clasifica riesgo: el rango de referencia de calcio varía por laboratorio, no hay un ' +
      'corte único que fijar. Sirve para no tratar (o para no descartar) una alteración de calcio ' +
      'que en realidad es un efecto de la albúmina baja.',
    acercaDe:
      'Cerca de la mitad del calcio sérico viaja unido a la albúmina, así que ' +
      'una albúmina baja hace parecer bajo un calcio que en realidad es ' +
      'normal. La corrección evita tratar (o descartar) algo que no está ' +
      'pasando.',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularCalcioCorregidoParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const calcio = num(b.calcioMgDl);
  const albumina = num(b.albuminaGDl);

  if (calcio === undefined || albumina === undefined) {
    return { calcioCorregidoMgDl: { valor: null } };
  }

  const corregido = calcio + 0.8 * (4.0 - albumina);
  return { calcioCorregidoMgDl: { valor: Math.round(corregido * 10) / 10 } };
}
