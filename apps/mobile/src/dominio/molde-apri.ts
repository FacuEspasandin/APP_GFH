import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * APRI, declarada contra el molde.
 *
 * `modo: 'corrido'`, tres números. Pide el límite superior normal (ULN) de
 * AST del laboratorio como campo propio, en vez de fijar uno adentro de la
 * fórmula: varía por equipo, y la escala publicada se define como cociente
 * contra ESE valor, no contra un número universal.
 */
export function moldeApri(): Molde {
  return {
    clave: 'apri',
    titulo: 'APRI',
    formula: 'APRI = (AST / límite superior normal) / Plaquetas × 100',
    modo: 'corrido',
    campos: [
      { tipo: 'numero', clave: 'astUI', rotulo: 'AST (GOT)', unidad: 'U/L', rango: RANGOS.astUI },
      {
        tipo: 'numero',
        clave: 'astUlnUI',
        rotulo: 'Límite superior normal de AST del laboratorio',
        unidad: 'U/L',
        rango: RANGOS.astUlnUI,
      },
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
      maximo: 3,
      tramos: [
        { hasta: 0.5, rotulo: 'Baja probabilidad de fibrosis significativa', color: 'ok' },
        { hasta: 1.5, rotulo: 'Indeterminado', color: 'media' },
        { hasta: 3, rotulo: 'Alta probabilidad de fibrosis significativa o cirrosis', color: 'grave' },
      ],
    },
    limite:
      'Validado sobre todo en hepatitis C crónica — en otras causas de enfermedad hepática es ' +
      'menos preciso. No diagnostica fibrosis, orienta a quién derivar para estudio.',
    acercaDe:
      'APRI (2003) combina AST y plaquetas para estimar fibrosis hepática ' +
      'significativa sin biopsia, útil sobre todo donde la elastografía no está ' +
      'disponible.',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularApriParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const ast = num(b.astUI);
  const uln = num(b.astUlnUI);
  const plaquetas = num(b.plaquetasMiles);

  if (ast === undefined || uln === undefined || plaquetas === undefined) {
    return { valor: { valor: null } };
  }

  if (uln <= 0 || plaquetas <= 0) {
    return { valor: { valor: null, porQueNo: 'con estos datos no sale (división por cero)' } };
  }

  const apri = (ast / uln / plaquetas) * 100;
  return { valor: { valor: Math.round(apri * 100) / 100 } };
}
