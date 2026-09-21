import { RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Superficie corporal (fórmula de Mosteller), declarada contra el molde.
 *
 * `modo: 'corrido'`: dos números que se escriben. `resultado.tipo: 'cifras'`
 * con una sola cifra y sin tramos — a diferencia de las otras calculadoras,
 * ésta no tiene interpretación de riesgo: es un valor continuo que se usa
 * como insumo de otro cálculo (dosis por m²), mismo criterio que HbA1c no
 * clasifica en bandas.
 */
export function moldeSuperficieCorporal(): Molde {
  return {
    clave: 'superficie-corporal',
    titulo: 'Superficie corporal',
    formula: 'Mosteller: SC (m²) = √((altura_cm × peso_kg) / 3600)',
    modo: 'corrido',
    campos: [
      { tipo: 'numero', clave: 'pesoKg', rotulo: 'Peso', unidad: 'kg', rango: RANGOS.pesoKg },
      { tipo: 'numero', clave: 'tallaCm', rotulo: 'Talla', unidad: 'cm', rango: RANGOS.alturaCm },
    ],
    resultado: {
      tipo: 'cifras',
      cifras: [{ clave: 'superficieM2', rotulo: 'Superficie corporal', unidad: 'm²' }],
    },
    limite:
      'No clasifica riesgo: es un insumo para dosificar fármacos por m² o para otros cálculos ' +
      'fisiológicos, no un hallazgo clínico en sí mismo.',
  };
}

/** Vacío o texto que no es número es «sin cargar», no cero. */
function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularSuperficieCorporalParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const pesoKg = num(b.pesoKg);
  const tallaCm = num(b.tallaCm);

  if (pesoKg === undefined || tallaCm === undefined || pesoKg <= 0 || tallaCm <= 0) {
    return { superficieM2: { valor: null } };
  }

  const superficie = Math.sqrt((tallaCm * pesoKg) / 3600);
  return { superficieM2: { valor: Math.round(superficie * 100) / 100 } };
}
