import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * FIB-4, declarada contra el molde.
 *
 * `modo: 'corrido'`, cuatro números. `resultado.tipo: 'anillo'`, mismo
 * criterio que Clcr y MELD: una fórmula real contra una escala continua, no
 * una suma de puntos.
 */
export function moldeFib4(): Molde {
  return {
    clave: 'fib4',
    titulo: 'FIB-4',
    formula: 'FIB-4 = (Edad × AST) / (Plaquetas × √ALT)',
    modo: 'corrido',
    campos: [
      { tipo: 'numero', clave: 'edadAnios', rotulo: 'Edad', unidad: 'años', rango: RANGOS.edadAnios },
      { tipo: 'numero', clave: 'astUI', rotulo: 'AST (GOT)', unidad: 'U/L', rango: RANGOS.astUI },
      { tipo: 'numero', clave: 'altUI', rotulo: 'ALT (GPT)', unidad: 'U/L', rango: RANGOS.altUI },
      {
        tipo: 'numero',
        clave: 'plaquetasMiles',
        rotulo: 'Plaquetas',
        unidad: 'miles/µL',
        rango: RANGOS.plaquetasMiles,
      },
    ],
    resultado: {
      tipo: 'anillo',
      unidad: 'índice',
      maximo: 8,
      tramos: [
        { hasta: 1.45, rotulo: 'Baja probabilidad de fibrosis avanzada', color: 'ok' },
        { hasta: 3.25, rotulo: 'Indeterminado', color: 'media' },
        { hasta: 8, rotulo: 'Alta probabilidad de fibrosis avanzada', color: 'grave' },
      ],
    },
    limite:
      'No diagnostica fibrosis — orienta a quién derivar para elastografía o biopsia. El corte de ' +
      '1,45 pierde sensibilidad en mayores de 65 años; algunas guías usan 2,0 en ese grupo.',
    acercaDe:
      'FIB-4 (2006) estima probabilidad de fibrosis hepática avanzada con ' +
      'cuatro datos de rutina, sin biopsia ni elastografía, para decidir a ' +
      'quién derivar a estudio especializado.',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularFib4ParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const edad = num(b.edadAnios);
  const ast = num(b.astUI);
  const alt = num(b.altUI);
  const plaquetas = num(b.plaquetasMiles);

  if (edad === undefined || ast === undefined || alt === undefined || plaquetas === undefined) {
    return { valor: { valor: null } };
  }

  if (plaquetas <= 0 || alt <= 0) {
    return { valor: { valor: null, porQueNo: 'con estos datos no sale (división por cero)' } };
  }

  const fib4 = (edad * ast) / (plaquetas * Math.sqrt(alt));
  return { valor: { valor: Math.round(fib4 * 100) / 100 } };
}
