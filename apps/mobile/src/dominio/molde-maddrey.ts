import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Función discriminante de Maddrey, declarada contra el molde.
 *
 * `modo: 'corrido'`, tres números. Pide el PT control del laboratorio como
 * campo propio —igual que APRI pide el ULN de AST— porque la fórmula
 * publicada resta contra ESE valor, no contra un normal fijo.
 */
export function moldeMaddrey(): Molde {
  return {
    clave: 'maddrey',
    titulo: 'Función discriminante de Maddrey',
    formula: 'DF = 4,6 × (PT paciente − PT control) + Bilirrubina total',
    modo: 'corrido',
    campos: [
      {
        tipo: 'numero',
        clave: 'ptPacienteSegundos',
        rotulo: 'Tiempo de protrombina del paciente',
        unidad: 'segundos',
        rango: RANGOS.ptSegundos,
      },
      {
        tipo: 'numero',
        clave: 'ptControlSegundos',
        rotulo: 'Tiempo de protrombina control del laboratorio',
        unidad: 'segundos',
        rango: RANGOS.ptSegundos,
      },
      {
        tipo: 'numero',
        clave: 'bilirrubinaMgDl',
        rotulo: 'Bilirrubina total',
        unidad: 'mg/dL',
        rango: RANGOS.bilirrubinaMgDl,
      },
    ],
    resultado: {
      tipo: 'anillo',
      unidad: 'puntos',
      maximo: 100,
      tramos: [
        { hasta: 32, rotulo: 'No cumple criterio de gravedad (DF < 32)', color: 'ok' },
        { hasta: 100, rotulo: 'Hepatitis alcohólica grave — considerar corticoides', color: 'grave' },
      ],
    },
    limite:
      'Sólo aplica a hepatitis alcohólica, no a cirrosis descompensada por otra causa. Un DF ≥ 32 ' +
      'orienta a corticoides, pero la decisión final depende también de contraindicaciones ' +
      '(infección activa, sangrado digestivo, insuficiencia renal).',
    acercaDe:
      'La función de Maddrey (1978) identifica hepatitis alcohólica grave con ' +
      'alta mortalidad a 30 días, y es el criterio clásico para decidir si dar ' +
      'corticoides.',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularMaddreyParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const ptPaciente = num(b.ptPacienteSegundos);
  const ptControl = num(b.ptControlSegundos);
  const bilirrubina = num(b.bilirrubinaMgDl);

  if (ptPaciente === undefined || ptControl === undefined || bilirrubina === undefined) {
    return { valor: { valor: null } };
  }

  const df = 4.6 * (ptPaciente - ptControl) + bilirrubina;
  return { valor: { valor: Math.round(df * 10) / 10 } };
}
