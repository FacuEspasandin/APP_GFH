import {
  calcularImc,
  DatoClinicoInvalido,
  RANGOS,
  type Borrador,
  type Molde,
  type Unidades,
} from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Índice de masa corporal, declarado contra el molde.
 *
 * `modo: 'corrido'` porque son dos números que se escriben, no criterios que
 * se eligen — mismo criterio que Clcr.
 *
 * Colores propios y no `COLOR_SEVERIDAD`: son seis bandas de una escala de
 * peso corporal, no la gravedad clínica de un hallazgo — mismo motivo por el
 * que el riesgo cardiovascular WHO/ISH tampoco usa la escala clínica.
 */
export function moldeImc(): Molde {
  return {
    clave: 'imc',
    titulo: 'Índice de masa corporal',
    formula: 'IMC = peso(kg) / talla(m)². Clasificación OMS.',
    modo: 'corrido',
    campos: [
      { tipo: 'numero', clave: 'pesoKg', rotulo: 'Peso', unidad: 'kg', rango: RANGOS.pesoKg },
      { tipo: 'numero', clave: 'alturaCm', rotulo: 'Talla', unidad: 'cm', rango: RANGOS.alturaCm },
    ],
    resultado: {
      tipo: 'anillo',
      unidad: 'kg/m²',
      // Tope de dibujo, no clínico: por encima el anillo queda lleno, y
      // Obesidad III no tiene techo real — el número exacto se sigue viendo
      // en el centro.
      maximo: 45,
      tramos: [
        { hasta: 18.4, rotulo: 'Bajo peso', color: '#3B82F6' },
        { hasta: 24.9, rotulo: 'Normal', color: '#22C55E' },
        { hasta: 29.9, rotulo: 'Sobrepeso', color: '#EAB308' },
        { hasta: 34.9, rotulo: 'Obesidad I', color: '#F97316' },
        { hasta: 39.9, rotulo: 'Obesidad II', color: '#EF4444' },
        { hasta: 100, rotulo: 'Obesidad III', color: '#991B1B' },
      ],
    },
    limite:
      'No distingue masa magra de grasa: un físicoculturista o un adulto ' +
      'mayor con sarcopenia pueden caer en la misma banda sin significar lo ' +
      'mismo. No aplica a menores de 18 años ni durante el embarazo.',
  };
}

/** Vacío o texto que no es número es «sin cargar», no cero. */
function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function calcularImcParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const pesoKg = num(b.pesoKg);
  const alturaCm = num(b.alturaCm);

  if (pesoKg === undefined || alturaCm === undefined) {
    return { valor: { valor: null } };
  }

  try {
    return { valor: { valor: calcularImc(pesoKg, alturaCm) } };
  } catch (e) {
    // Un valor fuera de rango mientras se tipea no es un error que mostrar:
    // es un campo a medio escribir. El anillo se queda vacío, no en rojo.
    if (e instanceof DatoClinicoInvalido) return { valor: { valor: null } };
    throw e;
  }
}
