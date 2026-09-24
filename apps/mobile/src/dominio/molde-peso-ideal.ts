import { OPCIONES_SEXO, RANGOS, type Borrador, type Molde, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Peso ideal y peso ajustado (fórmula de Devine), declarada contra el molde.
 *
 * `modo: 'corrido'`, `resultado.tipo: 'cifras'` — mismo criterio que
 * superficie corporal: es un insumo para dosificar, no un hallazgo clínico
 * en sí mismo, así que no clasifica en bandas.
 *
 * Dos cifras, no una: el peso ajustado sólo tiene sentido si el peso real
 * supera 120% del ideal (paciente con obesidad) — si no lo supera, se
 * informa por qué no aplica en vez de mostrar un número que nadie usaría.
 */
export function moldePesoIdeal(): Molde {
  return {
    clave: 'peso-ideal',
    titulo: 'Peso ideal',
    formula: 'Devine (1974): hombre 50 + 2,3×(pulgadas−60) · mujer 45,5 + 2,3×(pulgadas−60)',
    modo: 'corrido',
    campos: [
      {
        tipo: 'opcion',
        clave: 'sexo',
        rotulo: 'Sexo biológico',
        opciones: OPCIONES_SEXO.map((o) => ({ valor: o.valor, etiqueta: o.sigla })),
      },
      { tipo: 'numero', clave: 'tallaCm', rotulo: 'Talla', unidad: 'cm', rango: RANGOS.alturaCm },
      { tipo: 'numero', clave: 'pesoKg', rotulo: 'Peso real', unidad: 'kg', rango: RANGOS.pesoKg },
    ],
    resultado: {
      tipo: 'cifras',
      cifras: [
        { clave: 'pesoIdealKg', rotulo: 'Peso ideal', unidad: 'kg' },
        { clave: 'pesoAjustadoKg', rotulo: 'Peso ajustado', unidad: 'kg' },
      ],
    },
    limite:
      'No clasifica riesgo: es un insumo para dosificar fármacos en pacientes con obesidad, no ' +
      'un hallazgo clínico en sí mismo. La fórmula de Devine se valida desde 152 cm — bajo eso ' +
      'no aplica.',
  };
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularPesoIdealParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const sexo = b.sexo;
  const tallaCm = num(b.tallaCm);
  const pesoKg = num(b.pesoKg);

  if (sexo === undefined || tallaCm === undefined) {
    return { pesoIdealKg: { valor: null }, pesoAjustadoKg: { valor: null } };
  }

  if (tallaCm < 152) {
    return {
      pesoIdealKg: { valor: null, porQueNo: 'la fórmula de Devine no aplica bajo 152 cm' },
      pesoAjustadoKg: { valor: null, porQueNo: 'depende del peso ideal, que no se pudo calcular' },
    };
  }

  const pulgadas = tallaCm / 2.54;
  const base = sexo === 'F' ? 45.5 : 50;
  const pesoIdeal = base + 2.3 * (pulgadas - 60);
  const pesoIdealRedondeado = Math.round(pesoIdeal * 10) / 10;

  if (pesoKg === undefined) {
    return {
      pesoIdealKg: { valor: pesoIdealRedondeado },
      pesoAjustadoKg: { valor: null, porQueNo: 'falta el peso real' },
    };
  }

  if (pesoKg <= pesoIdeal * 1.2) {
    return {
      pesoIdealKg: { valor: pesoIdealRedondeado },
      pesoAjustadoKg: {
        valor: null,
        porQueNo: 'el peso real no supera 120% del ideal — no aplica peso ajustado',
      },
    };
  }

  const pesoAjustado = pesoIdeal + 0.4 * (pesoKg - pesoIdeal);
  return {
    pesoIdealKg: { valor: pesoIdealRedondeado },
    pesoAjustadoKg: { valor: Math.round(pesoAjustado * 10) / 10 },
  };
}
