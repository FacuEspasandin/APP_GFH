import { OPCIONES_SEXO, RANGOS, type Borrador, type Molde, type Tramo, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * QTc corregido (Bazett y Fridericia), declarada contra el molde.
 *
 * `modo: 'corrido'`: tres datos que se escriben/eligen, no criterios que se
 * eligen de a uno. `resultado.tipo: 'cifras'` porque son dos números —nunca
 * uno solo: Bazett sobrecorrige con taquicardia y subcorrige con
 * bradicardia, así que se muestran los dos siempre, con una nota de cuál
 * confiar.
 *
 * El molde no clasifica cada cifra en Normal/Límite/Prolongado —
 * `ResultadoCifras` no tiene tramos por cifra, y el corte depende del sexo,
 * que es un tercer dato además del par (QT, FC)—. Por eso `claveTramoQtc`
 * vive acá exportada, y la pantalla arma el badge de cada valor como
 * `extra`, mismo patrón que Clcr pinta el grado KDIGO aparte del molde.
 */
export function moldeQtc(): Molde {
  return {
    clave: 'qtc',
    titulo: 'QTc corregido',
    formula: 'Bazett: QTc = QT / √RR · Fridericia: QTc = QT / RR^(1/3)',
    modo: 'corrido',
    campos: [
      { tipo: 'numero', clave: 'qtMs', rotulo: 'QT medido', unidad: 'ms', rango: RANGOS.qtMs },
      {
        tipo: 'numero',
        clave: 'fcLpm',
        rotulo: 'Frecuencia cardíaca',
        unidad: 'lpm',
        rango: RANGOS.frecuenciaCardiacaLpm,
      },
      {
        tipo: 'opcion',
        clave: 'sexo',
        rotulo: 'Sexo biológico',
        opciones: OPCIONES_SEXO.map((o) => ({ valor: o.valor, etiqueta: o.sigla })),
      },
    ],
    resultado: {
      tipo: 'cifras',
      cifras: [
        { clave: 'bazettMs', rotulo: 'Bazett', unidad: 'ms' },
        { clave: 'fridericiaMs', rotulo: 'Fridericia', unidad: 'ms' },
      ],
    },
    limite:
      'Con frecuencia cardíaca fuera de 60–100 lpm, Bazett sobrecorrige o subcorrige — Fridericia ' +
      'es más confiable en esos extremos. Ninguna de las dos reemplaza la lectura del ECG completo.',
  };
}

/** Vacío o texto que no es número es «sin cargar», no cero. */
function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularQtcParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const qtMs = num(b.qtMs);
  const fcLpm = num(b.fcLpm);

  if (qtMs === undefined || fcLpm === undefined || fcLpm <= 0) {
    return { bazettMs: { valor: null }, fridericiaMs: { valor: null } };
  }

  const rrSegundos = 60 / fcLpm;
  const qtSegundos = qtMs / 1000;
  const bazett = (qtSegundos / Math.sqrt(rrSegundos)) * 1000;
  const fridericia = (qtSegundos / Math.cbrt(rrSegundos)) * 1000;

  return {
    bazettMs: { valor: Math.round(bazett) },
    fridericiaMs: { valor: Math.round(fridericia) },
  };
}

/**
 * El tramo de un QTc, según sexo — Bazett y Fridericia comparten la misma
 * escala de interpretación, sólo cambia el número que se le pasa.
 *
 * Sin guía de corte publicada para sexo «OTRO», se declara neutro en vez de
 * inventar un límite: es la Regla 5, ante falta de dato no se supone nada.
 */
export function claveTramoQtc(ms: number | null, sexo: string | undefined): Tramo | null {
  if (ms === null) return null;
  if (sexo !== 'M' && sexo !== 'F') {
    return { hasta: Infinity, rotulo: 'Sin corte de referencia definido para este sexo', color: 'neutro' };
  }

  if (ms > 500) return { hasta: Infinity, rotulo: 'Riesgo alto de arritmia', color: 'grave' };

  const limiteNormal = sexo === 'M' ? 430 : 450;
  const limiteBorde = sexo === 'M' ? 450 : 470;

  if (ms < limiteNormal) return { hasta: Infinity, rotulo: 'Normal', color: 'ok' };
  if (ms <= limiteBorde) return { hasta: Infinity, rotulo: 'Límite', color: 'media' };
  return { hasta: Infinity, rotulo: 'Prolongado', color: 'grave' };
}
