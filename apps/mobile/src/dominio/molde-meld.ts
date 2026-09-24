import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * MELD-Na, declarada contra el molde.
 *
 * `modo: 'corrido'`: cuatro números que se escriben, no criterios que se
 * eligen. `resultado.tipo: 'anillo'`, mismo criterio que Clcr — una cifra
 * contra una escala continua, no una suma de puntos.
 *
 * Se implementa MELD-Na (con sodio), no el MELD clásico: es el que usan hoy
 * la mayoría de los programas de trasplante para la lista de espera. La
 * corrección por sodio sólo se aplica si el MELD base supera 11 — regla de
 * la fórmula original (Kim et al. 2008, adoptada por OPTN/UNOS en 2016), no
 * un ajuste propio.
 */
export function moldeMeld(): Molde {
  return {
    clave: 'meld',
    titulo: 'MELD-Na',
    formula: 'MELD-Na: 3,78·ln(bili) + 11,2·ln(INR) + 9,57·ln(creat) + 6,43, corregido por sodio',
    modo: 'corrido',
    campos: [
      {
        tipo: 'numero',
        clave: 'bilirrubinaMgDl',
        rotulo: 'Bilirrubina',
        unidad: 'mg/dL',
        rango: RANGOS.bilirrubinaMgDl,
      },
      { tipo: 'numero', clave: 'inr', rotulo: 'INR', unidad: '', rango: RANGOS.inr },
      {
        tipo: 'numero',
        clave: 'creatininaMgDl',
        rotulo: 'Creatinina',
        unidad: 'mg/dL',
        rango: RANGOS.creatininaMgDl,
      },
      {
        tipo: 'numero',
        clave: 'sodioMeqL',
        rotulo: 'Sodio',
        unidad: 'mEq/L',
        rango: RANGOS.sodioMeqL,
      },
    ],
    resultado: {
      tipo: 'anillo',
      unidad: 'puntos',
      maximo: 40,
      tramos: [
        { hasta: 9, rotulo: 'Riesgo bajo de mortalidad a 90 días', color: 'ok' },
        { hasta: 19, rotulo: 'Riesgo moderado de mortalidad a 90 días', color: 'media' },
        { hasta: 40, rotulo: 'Riesgo alto de mortalidad a 90 días', color: 'grave' },
      ],
    },
    limite:
      'Prioriza lista de espera de trasplante y estima mortalidad — no reemplaza la evaluación ' +
      'completa del equipo de trasplante ni excepciones por otras condiciones (ej. hepatocarcinoma).',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

/**
 * La función pura que el molde no sabe correr: MELD-Na es una fórmula real,
 * no una suma de puntos.
 *
 * Valores menores a 1 se fijan en 1 antes del logaritmo (evita un log
 * negativo, regla de la fórmula original). Creatinina tope 4,0 — mismo
 * motivo, y porque por encima de eso la fórmula sobreestima en pacientes en
 * diálisis. El sodio se acota entre 125 y 137 antes de aplicar la
 * corrección — fuera de ese rango la fórmula no está validada.
 */
export function calcularMeldParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const bilirrubina = num(b.bilirrubinaMgDl);
  const inr = num(b.inr);
  const creatinina = num(b.creatininaMgDl);
  const sodio = num(b.sodioMeqL);

  if (bilirrubina === undefined || inr === undefined || creatinina === undefined || sodio === undefined) {
    return { valor: { valor: null } };
  }

  const biliAjustada = Math.max(bilirrubina, 1);
  const inrAjustado = Math.max(inr, 1);
  const creatAjustada = Math.min(Math.max(creatinina, 1), 4);

  const meldBase =
    3.78 * Math.log(biliAjustada) + 11.2 * Math.log(inrAjustado) + 9.57 * Math.log(creatAjustada) + 6.43;
  const meldRedondeado = Math.round(meldBase);

  // La corrección por sodio sólo aplica si el MELD base supera 11.
  let meldFinal = meldRedondeado;
  if (meldRedondeado > 11) {
    const sodioAcotado = Math.min(Math.max(sodio, 125), 137);
    const meldNa =
      meldRedondeado + 1.32 * (137 - sodioAcotado) - 0.033 * meldRedondeado * (137 - sodioAcotado);
    meldFinal = Math.round(meldNa);
  }

  return { valor: { valor: Math.min(Math.max(meldFinal, 6), 40) } };
}
