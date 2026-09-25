import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Anion Gap (brecha aniónica), declarada contra el molde.
 *
 * `modo: 'corrido'`: tres números, mismo criterio que Clcr. `resultado.tipo:
 * 'anillo'` — a diferencia de calcio/sodio corregidos, acá SÍ hay banda: el
 * corte de 16 es un punto de decisión de toxicología/emergencia (buscar
 * causa de acidosis), no una referencia de laboratorio poblacional que
 * varíe por institución.
 */
export function moldeAnionGap(): Molde {
  return {
    clave: 'anion-gap',
    titulo: 'Anion Gap',
    formula: 'AG = Na − (Cl + HCO3)',
    modo: 'corrido',
    campos: [
      { tipo: 'numero', clave: 'sodioMeqL', rotulo: 'Sodio', unidad: 'mEq/L', rango: RANGOS.sodioMeqL },
      { tipo: 'numero', clave: 'cloroMeqL', rotulo: 'Cloro', unidad: 'mEq/L', rango: RANGOS.cloroMeqL },
      {
        tipo: 'numero',
        clave: 'bicarbonatoMeqL',
        rotulo: 'Bicarbonato (HCO3)',
        unidad: 'mEq/L',
        rango: RANGOS.bicarbonatoMeqL,
      },
    ],
    resultado: {
      tipo: 'anillo',
      unidad: 'mEq/L',
      maximo: 30,
      tramos: [
        { hasta: 16, rotulo: 'Normal', color: 'ok' },
        { hasta: 30, rotulo: 'Elevado — buscar causa de acidosis de brecha alta', color: 'grave' },
      ],
    },
    limite:
      'No corrige por albúmina — con hipoalbuminemia el corte real de "elevado" es más bajo que ' +
      '16. No incluye potasio en la fórmula (variante menos usada).',
    acercaDe:
      'El anion gap distingue el tipo de acidosis metabólica: elevado sugiere ' +
      'ácido agregado (cetoacidosis, uremia, tóxicos); normal sugiere ' +
      'bicarbonato perdido (diarrea, acidosis tubular renal). Orienta la ' +
      'causa antes de pedir más estudios.',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularAnionGapParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const sodio = num(b.sodioMeqL);
  const cloro = num(b.cloroMeqL);
  const bicarbonato = num(b.bicarbonatoMeqL);

  if (sodio === undefined || cloro === undefined || bicarbonato === undefined) {
    return { valor: { valor: null } };
  }

  return { valor: { valor: Math.round(sodio - (cloro + bicarbonato)) } };
}
