import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * FENa (fracción excretada de sodio), declarada contra el molde.
 *
 * `modo: 'corrido'`: cuatro números, mismo criterio que Clcr. `resultado.tipo:
 * 'anillo'` con el resultado en % — no clasifica gravedad, distingue causa
 * (prerenal vs renal intrínseca), pero el patrón visual es el mismo.
 */
export function moldeFena(): Molde {
  return {
    clave: 'fena',
    titulo: 'FENa',
    formula: 'FENa (%) = (Na orina × Cr plasma) / (Na plasma × Cr orina) × 100',
    modo: 'corrido',
    campos: [
      {
        tipo: 'numero',
        clave: 'sodioOrinaMeqL',
        rotulo: 'Sodio en orina',
        unidad: 'mEq/L',
        rango: RANGOS.sodioOrinaMeqL,
      },
      {
        tipo: 'numero',
        clave: 'sodioMeqL',
        rotulo: 'Sodio en plasma',
        unidad: 'mEq/L',
        rango: RANGOS.sodioMeqL,
      },
      {
        tipo: 'numero',
        clave: 'creatininaOrinaMgDl',
        rotulo: 'Creatinina en orina',
        unidad: 'mg/dL',
        rango: RANGOS.creatininaOrinaMgDl,
      },
      {
        tipo: 'numero',
        clave: 'creatininaMgDl',
        rotulo: 'Creatinina en plasma',
        unidad: 'mg/dL',
        rango: RANGOS.creatininaMgDl,
      },
    ],
    resultado: {
      tipo: 'anillo',
      unidad: '%',
      // Tope de dibujo, no clínico: la NTA suele dar bastante más de 2%.
      maximo: 10,
      tramos: [
        { hasta: 1, rotulo: 'Sugiere causa prerenal', color: 'ok' },
        { hasta: 2, rotulo: 'Zona indeterminada', color: 'media' },
        { hasta: 10, rotulo: 'Sugiere necrosis tubular aguda (renal intrínseca)', color: 'grave' },
      ],
    },
    limite:
      'No es confiable si el paciente recibió diuréticos recientemente — ahí se usa FEUrea, un ' +
      'cálculo distinto que no reemplaza éste.',
    acercaDe:
      'La fracción excretada de sodio distingue si una insuficiencia renal ' +
      'aguda es prerenal (el riñón conserva sodio, responde a volumen) o ' +
      'intrínseca (necrosis tubular, el sodio se escapa). Un mismo dato de ' +
      'laboratorio, dos manejos completamente distintos.',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularFenaParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const sodioOrina = num(b.sodioOrinaMeqL);
  const sodioPlasma = num(b.sodioMeqL);
  const creatininaOrina = num(b.creatininaOrinaMgDl);
  const creatininaPlasma = num(b.creatininaMgDl);

  if (
    sodioOrina === undefined ||
    sodioPlasma === undefined ||
    creatininaOrina === undefined ||
    creatininaPlasma === undefined
  ) {
    return { valor: { valor: null } };
  }

  if (sodioPlasma <= 0 || creatininaOrina <= 0) {
    return { valor: { valor: null, porQueNo: 'con estos datos no sale (división por cero)' } };
  }

  const fena = ((sodioOrina * creatininaPlasma) / (sodioPlasma * creatininaOrina)) * 100;
  return { valor: { valor: Math.round(fena * 100) / 100 } };
}
