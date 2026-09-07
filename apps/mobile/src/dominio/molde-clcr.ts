import {
  calcularClcr,
  DatoClinicoInvalido,
  OPCIONES_SEXO,
  RANGOS,
  type Borrador,
  type Molde,
  type Unidades,
} from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Clearance de creatinina, declarada contra el molde.
 *
 * Segunda calculadora que deja de estar escrita a mano — la primera fue
 * Child-Pugh. Nada clínico se redefine acá: la fórmula sigue en
 * `calcularClcr` y los cortes son los mismos tres que ya pinta
 * `claveColorPorClcr` (grave < 30, media < 60, el resto normal).
 *
 * **`modo: 'corrido'`** porque son tres números que se escriben, no criterios
 * que se eligen — la cascada es para lo segundo (ver `moldeChildPugh`).
 *
 * **El grado KDIGO no entra en `tramos`.** Es una segunda escala con sus
 * propios cortes (90/60/45/30/15, no 30/60), y el molde no fusiona dos
 * escalas en una lista de tramos sin perder una — ver el mockup que se
 * aprobó antes de escribir esto. Se calcula aparte y la pantalla lo muestra
 * por `extra`, la vía que el molde deja para lo que le pertenece a una sola
 * calculadora.
 */
export function moldeClcr(): Molde {
  return {
    clave: 'clcr',
    titulo: 'Clearance de creatinina',
    formula: 'Cockcroft-Gault. En sexo femenino, con el factor 0,85.',
    modo: 'corrido',
    campos: [
      { tipo: 'numero', clave: 'edadAnios', rotulo: 'Edad', unidad: 'años', rango: RANGOS.edadAnios },
      { tipo: 'numero', clave: 'pesoKg', rotulo: 'Peso', unidad: 'kg', rango: RANGOS.pesoKg },
      {
        tipo: 'numero',
        clave: 'creatininaMgDl',
        rotulo: 'Creatinina',
        unidad: 'mg/dL',
        rango: RANGOS.creatininaMgDl,
      },
      {
        tipo: 'opcion',
        clave: 'sexo',
        rotulo: 'Sexo biológico',
        opciones: OPCIONES_SEXO.map((o) => ({ valor: o.valor, etiqueta: o.sigla })),
      },
    ],
    resultado: {
      tipo: 'anillo',
      unidad: 'mL/min',
      // Tope de dibujo, no clínico: por encima el anillo queda lleno y lo
      // único que importa es que la función es normal.
      maximo: 120,
      tramos: [
        { hasta: 29.9, rotulo: 'Insuficiencia grave', color: 'grave' },
        { hasta: 59.9, rotulo: 'Insuficiencia leve a moderada', color: 'media' },
        { hasta: 120, rotulo: 'Función preservada', color: 'ok' },
      ],
    },
    limite:
      'Este número no dice cuánto ajustar cada fármaco. Para eso hace falta ' +
      'cruzarlo contra las tablas del catálogo, que es lo que hace GFH con ' +
      'un paciente cargado.',
  };
}

/** Vacío o texto que no es número es «sin cargar», no cero. */
function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

/**
 * La función pura que el molde no sabe correr: sumar puntos no sirve acá, hay
 * una fórmula real detrás. Mismo criterio que Child-Pugh — el molde declara
 * la forma, esto declara el cálculo.
 */
export function calcularClcrParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const edadAnios = num(b.edadAnios);
  const pesoKg = num(b.pesoKg);
  const creatininaMgDl = num(b.creatininaMgDl);
  const sexo = b.sexo;

  if (edadAnios === undefined || pesoKg === undefined || creatininaMgDl === undefined) {
    return { valor: { valor: null } };
  }

  try {
    return {
      valor: {
        valor: calcularClcr({
          edadAnios,
          pesoKg,
          creatininaMgDl,
          sexo: sexo === 'M' || sexo === 'F' ? sexo : 'OTRO',
        }),
      },
    };
  } catch (e) {
    // Un valor fuera de rango mientras se tipea no es un error que mostrar:
    // es un campo a medio escribir. El anillo se queda vacío, no en rojo.
    if (e instanceof DatoClinicoInvalido) return { valor: { valor: null } };
    throw e;
  }
}
