/**
 * Colesterol LDL y no-HDL a partir del perfil lipídico.
 *
 * Dominio puro: sin Prisma, sin I/O. Vive en el paquete compartido por la misma
 * razón que el Clcr y el Child-Pugh — si algún día el perfil lipídico pasa a ser
 * un dato del paciente, el backend calcula con esta misma función y no con una
 * copia.
 *
 * Las cuatro fórmulas son publicadas y entran tal cual. Lo único propio es
 * decidir **cuándo una no aplica y por qué** — que es la parte que más importa,
 * porque un LDL calculado fuera de sus condiciones no se ve mal: se ve como un
 * número normal y equivocado.
 */

export type UnidadLipidos = 'mg/dL' | 'mmol/L';

/**
 * Los dos factores son distintos porque son moléculas distintas.
 *
 * El colesterol pesa ~386,7 g/mol y los triglicéridos ~885,7. Usar el mismo
 * factor para los dos es el error clásico de estas conversiones, y da un LDL
 * plausible con el VLDL mal estimado.
 */
const MG_DL_POR_MMOL_COLESTEROL = 38.67;
const MG_DL_POR_MMOL_TRIGLICERIDOS = 88.57;

export function colesterolAMgDl(valor: number, unidad: UnidadLipidos): number {
  return unidad === 'mg/dL' ? valor : valor * MG_DL_POR_MMOL_COLESTEROL;
}

export function colesterolDesdeMgDl(valor: number, unidad: UnidadLipidos): number {
  return unidad === 'mg/dL' ? valor : valor / MG_DL_POR_MMOL_COLESTEROL;
}

export function trigliceridosAMgDl(valor: number, unidad: UnidadLipidos): number {
  return unidad === 'mg/dL' ? valor : valor * MG_DL_POR_MMOL_TRIGLICERIDOS;
}

/**
 * Por encima de acá, Friedewald deja de servir.
 *
 * El término `TG/5` estima el VLDL suponiendo una proporción que se rompe con
 * triglicéridos altos, y el LDL sale **falsamente bajo** — el peor sentido
 * posible del error, porque tranquiliza.
 *
 * El corte se compara SIEMPRE en mg/dL aunque el médico esté trabajando en
 * mmol/L. Los 4,5 mmol/L que suele citarse son 400 mg/dL redondeados: comparar
 * contra 4,5 haría que un valor de 4,51 —que son 399,5 mg/dL— quedara sin
 * calcular por un redondeo.
 */
export const TOPE_TG_FRIEDEWALD_MG_DL = 400;

/**
 * Por qué no hay número.
 *
 * `SIN_DATO` es la ausencia; los otros tres son datos presentes que hacen que
 * la fórmula no se pueda aplicar. La distinción importa: uno lo resuelve el
 * médico escribiendo, los otros no.
 */
export type MotivoSinValor = 'SIN_DATO' | 'TG_ALTOS' | 'NEGATIVO' | 'HDL_MAYOR_QUE_TOTAL';

export interface ValorLipidico {
  /** `null` cuando no se pudo calcular. Nunca cero, nunca estimado. */
  valor: number | null;
  motivo: MotivoSinValor | null;
}

export type ClaveFormulaLdl = 'friedewald' | 'chen' | 'cordova';

export interface FormulaLdl {
  clave: ClaveFormulaLdl;
  nombre: string;
  /** Se muestra en pantalla: es lo que hace la respuesta trazable (regla 1). */
  formula: string;
  anio: number;
}

export const FORMULAS_LDL: readonly FormulaLdl[] = [
  {
    clave: 'friedewald',
    nombre: 'Friedewald',
    formula: 'TC − HDL − TG/5',
    anio: 1972,
  },
  {
    clave: 'chen',
    nombre: 'Chen',
    formula: '0,9 × (TC − HDL) − 0,1 × TG',
    anio: 2010,
  },
  {
    clave: 'cordova',
    nombre: 'de Cordova',
    formula: '¾ × (TC − HDL)',
    anio: 2013,
  },
] as const;

export interface EntradaLipidos {
  /** En la unidad de `unidad`. `undefined` el que no se cargó. */
  colesterolTotal?: number;
  hdl?: number;
  trigliceridos?: number;
  unidad: UnidadLipidos;
}

export interface ResultadoLipidos {
  /** Friedewald: la que usan las guías, y la única con un tope declarado. */
  ldl: ValorLipidico;
  /** Siempre calculable con total y HDL. Es la respuesta cuando Friedewald cae. */
  noHdl: ValorLipidico;
  /** Las otras dos, en el orden de `FORMULAS_LDL`. Sin ordenar por «mejor»:
   *  no lo sabemos, y un orden implicaría un juicio que no podemos sostener. */
  alternativas: (ValorLipidico & { formula: FormulaLdl })[];
  unidad: UnidadLipidos;
}

/**
 * Lo que invalida a TODAS las fórmulas de una vez.
 *
 * Un HDL mayor que el colesterol total no es un caso clínico raro: es un dato
 * mal escrito, o dos unidades mezcladas. Ninguna de las cuatro fórmulas
 * significa nada en ese caso, así que se corta antes de calcular.
 */
function inconsistente(total: number | undefined, hdl: number | undefined): boolean {
  return total !== undefined && hdl !== undefined && hdl > total;
}

/** Un resultado negativo no es un LDL bajo: es una fórmula fuera de su rango. */
function noNegativo(n: number, unidad: UnidadLipidos): ValorLipidico {
  return n < 0
    ? { valor: null, motivo: 'NEGATIVO' }
    : { valor: redondear(n, unidad), motivo: null };
}

/**
 * Entero en mg/dL, un decimal en mmol/L: es como informa un laboratorio.
 *
 * No es cosmético. Un LDL de «155,8 mg/dL» aparenta una precisión que una
 * estimación a partir de otras tres medidas no tiene, y la escala de mg/dL es
 * lo bastante gruesa como para que el decimal no agregue nada.
 */
function redondear(n: number, unidad: UnidadLipidos): number {
  return unidad === 'mg/dL' ? Math.round(n) : Math.round(n * 10) / 10;
}

export function calcularLipidos(e: EntradaLipidos): ResultadoLipidos {
  const { colesterolTotal: tc, hdl, trigliceridos: tg, unidad } = e;

  const faltaBase = tc === undefined || hdl === undefined;
  const malo = inconsistente(tc, hdl);

  // --- no-HDL: total menos HDL, sin unidades de por medio -------------------
  const noHdl: ValorLipidico = faltaBase
    ? { valor: null, motivo: 'SIN_DATO' }
    : malo
      ? { valor: null, motivo: 'HDL_MAYOR_QUE_TOTAL' }
      : { valor: redondear(tc! - hdl!, unidad), motivo: null };

  // --- Friedewald -----------------------------------------------------------
  let ldl: ValorLipidico;
  if (faltaBase || tg === undefined) {
    ldl = { valor: null, motivo: 'SIN_DATO' };
  } else if (malo) {
    ldl = { valor: null, motivo: 'HDL_MAYOR_QUE_TOTAL' };
  } else if (trigliceridosAMgDl(tg, unidad) > TOPE_TG_FRIEDEWALD_MG_DL) {
    ldl = { valor: null, motivo: 'TG_ALTOS' };
  } else {
    // Publicada en las dos unidades, con divisor propio para cada una: 5 en
    // mg/dL, 2,2 en mmol/L. Se calcula en la unidad que entró para no arrastrar
    // el redondeo de convertir y reconvertir.
    const divisor = unidad === 'mg/dL' ? 5 : 2.2;
    ldl = noNegativo(tc! - hdl! - tg / divisor, unidad);
  }

  // --- las alternativas -----------------------------------------------------
  const alternativas = FORMULAS_LDL.filter((f) => f.clave !== 'friedewald').map((formula) => ({
    formula,
    ...(formula.clave === 'chen' ? chen(tc, hdl, tg, unidad) : cordova(tc, hdl, malo, unidad)),
  }));

  return { ldl, noHdl, alternativas, unidad };
}

/**
 * Chen 2010.
 *
 * Se calcula SIEMPRE en mg/dL y se reconvierte, aunque el médico trabaje en
 * mmol/L. El motivo es el coeficiente `0,1 × TG`: a diferencia de Friedewald,
 * que está publicada en las dos unidades, ésta sólo lo está en mg/dL, y ese
 * 0,1 no es trasladable — colesterol y triglicéridos convierten con factores
 * distintos, así que en mmol/L habría que usar 0,229. Aplicar 0,1 sobre mmol/L
 * daría un número plausible y equivocado.
 *
 * No tiene tope de triglicéridos declarado: los usa con un peso diez veces
 * menor que Friedewald.
 */
function chen(
  tc: number | undefined,
  hdl: number | undefined,
  tg: number | undefined,
  unidad: UnidadLipidos,
): ValorLipidico {
  if (tc === undefined || hdl === undefined || tg === undefined) {
    return { valor: null, motivo: 'SIN_DATO' };
  }
  if (inconsistente(tc, hdl)) return { valor: null, motivo: 'HDL_MAYOR_QUE_TOTAL' };

  const enMgDl =
    0.9 * (colesterolAMgDl(tc, unidad) - colesterolAMgDl(hdl, unidad)) -
    0.1 * trigliceridosAMgDl(tg, unidad);

  if (enMgDl < 0) return { valor: null, motivo: 'NEGATIVO' };
  return { valor: redondear(colesterolDesdeMgDl(enMgDl, unidad), unidad), motivo: null };
}

/**
 * de Cordova 2013: tres cuartos del no-HDL.
 *
 * No usa triglicéridos, así que sigue dando un número cuando Friedewald no
 * puede. Es una proporción, así que no depende de la unidad.
 */
function cordova(
  tc: number | undefined,
  hdl: number | undefined,
  malo: boolean,
  unidad: UnidadLipidos,
): ValorLipidico {
  if (tc === undefined || hdl === undefined) return { valor: null, motivo: 'SIN_DATO' };
  if (malo) return { valor: null, motivo: 'HDL_MAYOR_QUE_TOTAL' };
  return { valor: redondear(0.75 * (tc - hdl), unidad), motivo: null };
}

// --- por qué no hay número ---------------------------------------------------

/**
 * La explicación de cada causa, para mostrar en pantalla.
 *
 * Vive acá y no en la pantalla porque es contenido clínico, no copy: dice qué
 * pasa con la fórmula y en qué sentido erraría. Un «no se puede calcular» sin
 * el motivo manda al médico a buscar afuera lo que la app ya sabe.
 */
export const EXPLICACION_SIN_LDL: Record<MotivoSinValor, string> = {
  SIN_DATO: 'Falta un valor del perfil lipídico.',
  TG_ALTOS:
    'Friedewald no aplica con triglicéridos por encima de 400 mg/dL: el término TG/5 deja de estimar bien el VLDL y el LDL saldría falsamente bajo.',
  NEGATIVO:
    'La fórmula da un valor negativo, que no existe. Suele ser un dato mal escrito o dos unidades mezcladas.',
  HDL_MAYOR_QUE_TOTAL:
    'El HDL no puede ser mayor que el colesterol total. Revisá los valores o la unidad: con esos números ninguna fórmula significa nada.',
};

/** Qué falta, dicho con nombre. Sólo para `SIN_DATO`. */
export function faltantesLipidos(e: EntradaLipidos): string[] {
  const faltan: string[] = [];
  if (e.colesterolTotal === undefined) faltan.push('colesterol total');
  if (e.hdl === undefined) faltan.push('HDL');
  if (e.trigliceridos === undefined) faltan.push('triglicéridos');
  return faltan;
}
