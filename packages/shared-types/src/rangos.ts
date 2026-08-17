/**
 * Qué acepta cada campo numérico, en un solo lugar.
 *
 * Antes estaban escritos dos veces —`LIMITES` en `clcr.ts` y los `@Min/@Max` de
 * los DTO— y ya habían divergido: el motor pedía peso mayor a 0 y el DTO mayor
 * o igual a 0,1. De acá salen las tres cosas: la validación del backend, la del
 * motor, y el rótulo que ve el médico debajo del campo.
 *
 * Hay **dos niveles**, y confundirlos haría que la app rechace pacientes
 * reales:
 *
 *   `min`/`max`          El valor rompe la fórmula o no existe. **Corta.** Una
 *                        creatinina de 0 hace que Cockcroft-Gault divida por
 *                        cero; un peso de 0 da un Clcr de 0 que caería en el
 *                        peor tramo de la tabla como si fuera un dato real.
 *
 *   `habitual`           El valor existe pero casi seguro es una errata —de
 *                        unidad, la mayoría de las veces—. **Avisa y calcula
 *                        igual.** Los triglicéridos llegan a cifras enormes en
 *                        hipertrigliceridemias severas: poner un techo ahí sería
 *                        inventar un límite que no existe.
 *
 * Lo que NO hay acá son rangos de referencia clínicos. «Colesterol normal
 * 150-200» varía por laboratorio, sexo y edad: es contenido clínico y necesita
 * la misma validación farmacéutica que el resto del catálogo.
 */

export interface Rango {
  min: number;
  max: number;
  /** `true` cuando el mínimo no vale: la creatinina puede ser 0,01 pero no 0. */
  minExclusivo?: boolean;
  /** Fuera de esto se avisa, no se corta. Sin definir = no se avisa nunca. */
  habitual?: { min: number; max: number };
  /**
   * Decimales del RÓTULO, no del valor.
   *
   * Una creatinina se escribe como 1,4 pero su rango se lee mejor como
   * «0 – 30» que como «0,00 – 30,00»: el rótulo comunica magnitud, no
   * precisión, y los ceros a la derecha compiten con el número que el médico
   * está escribiendo.
   */
  decimales: number;
}

/**
 * Los límites que corta cada campo.
 *
 * Los de Clcr y los del paciente son **exactamente** los que ya se validaban
 * antes de unificarlos: acá no se afloja nada, sólo se deja de escribirlo dos
 * veces. Los de lípidos son nuevos y son deliberadamente anchos — la fórmula no
 * se rompe con un colesterol alto, así que el único corte real es el cero.
 */
export const RANGOS = {
  edadAnios: { min: 0, max: 120, decimales: 0, habitual: { min: 0, max: 110 } },
  pesoKg: { min: 0, max: 500, minExclusivo: true, decimales: 0, habitual: { min: 1, max: 300 } },
  alturaCm: { min: 20, max: 260, decimales: 0, habitual: { min: 40, max: 220 } },
  creatininaMgDl: {
    min: 0,
    max: 30,
    minExclusivo: true,
    decimales: 0,
    // Arriba de 15 mg/dL es diálisis o una creatinina cargada en µmol/L: 88
    // µmol/L es 1 mg/dL, así que el error de unidad cae muy lejos.
    habitual: { min: 0.2, max: 15 },
  },
  clcrMlMin: { min: 0, max: 300, decimales: 0, habitual: { min: 1, max: 200 } },
  semanaGestacion: { min: 1, max: 45, decimales: 0 },

  // --- Child-Pugh, sólo el valor exacto opcional ----------------------------
  bilirrubinaMgDl: { min: 0, max: 80, minExclusivo: true, decimales: 0, habitual: { min: 0.1, max: 30 } },
  albuminaGDl: { min: 0, max: 10, minExclusivo: true, decimales: 0, habitual: { min: 1, max: 6 } },
  inr: { min: 0.5, max: 20, decimales: 1, habitual: { min: 0.8, max: 8 } },

  // --- lípidos, en mg/dL. Se convierten para mostrarlos en mmol/L. ----------
  colesterolTotal: { min: 0, max: 2000, minExclusivo: true, decimales: 0, habitual: { min: 50, max: 400 } },
  hdl: { min: 0, max: 300, minExclusivo: true, decimales: 0, habitual: { min: 10, max: 150 } },
  trigliceridos: {
    min: 0,
    max: 20000,
    minExclusivo: true,
    decimales: 0,
    // Mil ya es una hipertrigliceridemia severa. Más que eso existe, pero vale
    // la pena preguntar si el número es ése.
    habitual: { min: 20, max: 1000 },
  },
} as const satisfies Record<string, Rango>;

export type CampoConRango = keyof typeof RANGOS;

// --- convertir un rango a otra unidad ----------------------------------------

/**
 * El mismo rango, expresado en otra unidad.
 *
 * Existe para no escribir cada rango dos veces: los lípidos se declaran en
 * mg/dL y se convierten para mostrarlos en mmol/L. Escribir las dos versiones a
 * mano es cómo se desincronizan.
 */
export function rangoConvertido(r: Rango, convertir: (n: number) => number, decimales: number): Rango {
  return {
    min: convertir(r.min),
    max: convertir(r.max),
    minExclusivo: r.minExclusivo,
    decimales,
    habitual: r.habitual
      ? { min: convertir(r.habitual.min), max: convertir(r.habitual.max) }
      : undefined,
  };
}

// --- el rótulo ---------------------------------------------------------------

function conDecimales(n: number, decimales: number): string {
  // Coma decimal: es lo que se lee en español y lo que muestra el resto de la app.
  return n.toFixed(decimales).replace('.', ',');
}

/**
 * «1 – 500», «0,01 – 30».
 *
 * El mínimo exclusivo NO se dibuja como «0,01 – 30» inventando un valor: se
 * muestra el 0 y el aviso de abajo explica que tiene que ser mayor. Poner 0,01
 * haría creer que 0,005 no se acepta, y sí se acepta.
 */
export function etiquetaRango(r: Rango): string {
  return `${conDecimales(r.min, r.decimales)} – ${conDecimales(r.max, r.decimales)}`;
}

// --- evaluar un valor --------------------------------------------------------

export type EstadoValor = 'ok' | 'implausible' | 'invalido';

export interface Veredicto {
  estado: EstadoValor;
  /** Qué decirle al médico. `null` cuando está todo bien. */
  mensaje: string | null;
}

const OK: Veredicto = { estado: 'ok', mensaje: null };

/**
 * Si el valor sirve, si conviene revisarlo, o si rompe la fórmula.
 *
 * `undefined` —el campo vacío— es `ok`: todavía no hay nada que juzgar, y un
 * aviso antes de escribir se lee como un error.
 */
export function evaluarValor(valor: number | undefined, r: Rango): Veredicto {
  if (valor === undefined) return OK;

  if (!Number.isFinite(valor)) {
    return { estado: 'invalido', mensaje: 'No es un número.' };
  }
  if (r.minExclusivo ? valor <= r.min : valor < r.min) {
    return {
      estado: 'invalido',
      mensaje: `Tiene que ser mayor ${r.minExclusivo ? 'a' : 'o igual a'} ${conDecimales(r.min, r.decimales)}.`,
    };
  }
  if (valor > r.max) {
    return {
      estado: 'invalido',
      mensaje: `Tiene que ser menor o igual a ${conDecimales(r.max, r.decimales)}.`,
    };
  }

  if (r.habitual && (valor < r.habitual.min || valor > r.habitual.max)) {
    // Corto a propósito: estos campos suelen ir de a tres en una fila, y un
    // mensaje largo apila cinco renglones y empuja el formulario entero. El
    // detalle —que se calcula igual, y que suele ser la unidad— va en el aviso
    // de arriba del resultado, donde hay ancho.
    return { estado: 'implausible', mensaje: 'Fuera de lo habitual' };
  }

  return OK;
}

/**
 * El aviso de arriba, cuando hay valores implausibles y una unidad en juego.
 *
 * Sugiere la conversión porque el error de unidad es la causa más común, y
 * decirle al médico «1500 mg/dL serían 38,8 mmol/L» le da la pista en vez de
 * sólo señalar que algo está raro.
 */
export function sugerenciaDeUnidad(
  valor: number,
  otraUnidad: string,
  enOtraUnidad: number,
  decimales = 1,
): string {
  return `${conDecimales(valor, 0)} serían ${conDecimales(enOtraUnidad, decimales)} ${otraUnidad}.`;
}
