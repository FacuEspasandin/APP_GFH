import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Gap osmolar, declarada contra el molde.
 *
 * `modo: 'corrido'`, cuatro números. Pide "urea" y no "BUN" — en Uruguay el
 * laboratorio informa urea, mismo motivo que CURB-65 — y la fórmula convierte
 * internamente (urea/6 en vez de BUN/2,8, porque BUN = urea/2,14 y
 * 2,14×2,8≈6).
 *
 * `resultado.tipo: 'anillo'`: el corte de gap elevado es de toxicología
 * (sospecha de tóxico no medido), no una referencia de laboratorio.
 */
export function moldeGapOsmolar(): Molde {
  return {
    clave: 'gap-osmolar',
    titulo: 'Gap osmolar',
    formula: 'Osm. calculada = 2×Na + Glucosa/18 + Urea/6. Gap = medida − calculada',
    modo: 'corrido',
    campos: [
      { tipo: 'numero', clave: 'sodioMeqL', rotulo: 'Sodio', unidad: 'mEq/L', rango: RANGOS.sodioMeqL },
      { tipo: 'numero', clave: 'glucosaMgDl', rotulo: 'Glucosa', unidad: 'mg/dL', rango: RANGOS.glucosaMgDl },
      { tipo: 'numero', clave: 'ureaMgDl', rotulo: 'Urea', unidad: 'mg/dL', rango: RANGOS.ureaMgDl },
      {
        tipo: 'numero',
        clave: 'osmolaridadMedidaMOsmKg',
        rotulo: 'Osmolaridad medida',
        unidad: 'mOsm/kg',
        rango: RANGOS.osmolaridadMOsmKg,
      },
    ],
    resultado: {
      tipo: 'anillo',
      unidad: 'mOsm/kg',
      maximo: 40,
      tramos: [
        { hasta: 10, rotulo: 'Normal', color: 'ok' },
        { hasta: 20, rotulo: 'Indeterminado', color: 'media' },
        { hasta: 40, rotulo: 'Sugiere tóxico no medido', color: 'grave' },
      ],
    },
    limite:
      'No identifica CUÁL tóxico — sólo señala que hay osmoles sin medir circulando. El contexto ' +
      'clínico (exposición, síntomas) decide qué estudiar después.',
    acercaDe:
      'La brecha entre la osmolaridad medida y la calculada detecta sustancias ' +
      'osmóticamente activas que la fórmula no ve — típicamente etanol, ' +
      'metanol o etilenglicol — útil como alerta temprana de intoxicación ' +
      'antes de tener el resultado específico.',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularGapOsmolarParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const sodio = num(b.sodioMeqL);
  const glucosa = num(b.glucosaMgDl);
  const urea = num(b.ureaMgDl);
  const medida = num(b.osmolaridadMedidaMOsmKg);

  if (sodio === undefined || glucosa === undefined || urea === undefined || medida === undefined) {
    return { valor: { valor: null } };
  }

  const calculada = 2 * sodio + glucosa / 18 + urea / 6;
  return { valor: { valor: Math.round(medida - calculada) } };
}
