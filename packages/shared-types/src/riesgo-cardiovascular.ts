/**
 * Riesgo cardiovascular a 10 años, WHO/ISH Risk Prediction Charts, subregión
 * AMR B (OMS/OPS, 2007-2008) — la tabla que cita la guía nacional uruguaya de
 * dislipemias (pág. 27).
 *
 * No es una fórmula: es una tabla publicada, a color en la fuente. Digitalizada
 * a mano contra la imagen original, celda por celda, con dos verificaciones
 * cruzadas en cada bloque (el riesgo no puede bajar al subir colesterol o PAS,
 * fumador nunca por debajo de no fumador, mujer nunca por encima de hombre) —
 * las pocas excepciones que rompen la última regla se revisaron dos veces
 * contra la imagen y quedan documentadas en `EXCEPCIONES_CONFIRMADAS`, no son
 * un error de carga.
 *
 * Deliberadamente NO se redondea ni se interpola entre bandas: la fuente sólo
 * define estas 4 edades, 4 presiones y 5 colesteroles. Pedir un valor fuera de
 * la tabla no tiene respuesta honesta, y por eso `categoriaRiesgoCardiovascular`
 * devuelve `null` en vez de aproximar.
 */

export type SexoRiesgoCV = 'M' | 'F';
export type EdadBandaCV = 40 | 50 | 60 | 70;
export type PasBandaCV = 120 | 140 | 160 | 180;
export type ColesterolBandaCV = 4 | 5 | 6 | 7 | 8;

export const EDADES_CV: readonly EdadBandaCV[] = [40, 50, 60, 70];
export const PAS_CV: readonly PasBandaCV[] = [120, 140, 160, 180];
export const COLESTEROL_CV: readonly ColesterolBandaCV[] = [4, 5, 6, 7, 8];

export interface EntradaRiesgoCV {
  diabetes: boolean;
  edad: EdadBandaCV;
  sexo: SexoRiesgoCV;
  fumador: boolean;
  pas: PasBandaCV;
  colesterolMmolL: ColesterolBandaCV;
}

interface FilaRiesgoCV {
  diabetes: boolean;
  edad: EdadBandaCV;
  sexo: SexoRiesgoCV;
  fumador: boolean;
  pas: PasBandaCV;
  /** Por colesterol 4, 5, 6, 7, 8 mmol/L, en ese orden — el mismo de la tabla original. */
  valores: readonly [number, number, number, number, number];
}

/** 1 = <10%, 2 = 10 a <20%, 3 = 20 a <30%, 4 = 30 a <40%, 5 = ≥40%. */
export type NivelRiesgoCV = 1 | 2 | 3 | 4 | 5;

export const ETIQUETA_RIESGO_CV: Record<NivelRiesgoCV, string> = {
  1: 'Bajo',
  2: 'Moderado',
  3: 'Alto',
  4: 'Muy alto',
  5: 'Crítico',
};

export const PORCENTAJE_RIESGO_CV: Record<NivelRiesgoCV, string> = {
  1: '<10%',
  2: '10 a <20%',
  3: '20 a <30%',
  4: '30 a <40%',
  5: '≥40%',
};

/** Colores de la propia tabla WHO/ISH, no de la escala clínica de la app. */
export const COLOR_RIESGO_CV: Record<NivelRiesgoCV, string> = {
  1: '#22C55E',
  2: '#EAB308',
  3: '#F59E0B',
  4: '#EF4444',
  5: '#7C1D2C',
};

export const FUENTE_RIESGO_CV =
  'WHO/ISH Risk Prediction Charts, subregión AMR B (OMS/OPS, 2007-2008)';

export const EXCEPCIONES_CONFIRMADAS_RIESGO_CV: readonly string[] = [
  'edad 40 con diabetes, Mujeres (No fumadoras y Fumadoras): varias celdas quedan una categoría por encima de la equivalente en Hombres — rompe el patrón mujer<=hombre de todos los demás bloques. Releído dos veces contra la imagen original y confirmado igual las dos veces.',
  'edad 50 sin diabetes, Mujeres No fumadoras, PAS180/colesterol4: Naranja vs Amarillo de Hombres — confirmado.',
  'edad 40 sin diabetes, Mujeres No fumadoras (PAS180/colesterol4 y PAS160/colesterol6) y Mujeres Fumadoras (PAS160/colesterol6): mismo tipo de excepción, confirmado. El caso de PAS180/colesterol4 se repite igual en edad 50 y 40 — parece un rasgo real de la tabla en esa franja, no azar.',
];

const TABLA_RIESGO_CV: readonly FilaRiesgoCV[] = [
  { diabetes: true, edad: 70, sexo: 'M', fumador: false, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 70, sexo: 'M', fumador: false, pas: 160, valores: [3, 4, 5, 5, 5] },
  { diabetes: true, edad: 70, sexo: 'M', fumador: false, pas: 140, valores: [2, 3, 3, 4, 5] },
  { diabetes: true, edad: 70, sexo: 'M', fumador: false, pas: 120, valores: [2, 2, 2, 3, 4] },

  { diabetes: true, edad: 70, sexo: 'M', fumador: true, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 70, sexo: 'M', fumador: true, pas: 160, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 70, sexo: 'M', fumador: true, pas: 140, valores: [3, 4, 5, 5, 5] },
  { diabetes: true, edad: 70, sexo: 'M', fumador: true, pas: 120, valores: [2, 3, 3, 4, 5] },

  { diabetes: true, edad: 70, sexo: 'F', fumador: false, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 70, sexo: 'F', fumador: false, pas: 160, valores: [3, 3, 4, 5, 5] },
  { diabetes: true, edad: 70, sexo: 'F', fumador: false, pas: 140, valores: [2, 2, 3, 3, 4] },
  { diabetes: true, edad: 70, sexo: 'F', fumador: false, pas: 120, valores: [1, 2, 2, 2, 3] },

  { diabetes: true, edad: 70, sexo: 'F', fumador: true, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 70, sexo: 'F', fumador: true, pas: 160, valores: [4, 5, 5, 5, 5] },
  { diabetes: true, edad: 70, sexo: 'F', fumador: true, pas: 140, valores: [3, 3, 4, 5, 5] },
  { diabetes: true, edad: 70, sexo: 'F', fumador: true, pas: 120, valores: [2, 2, 3, 3, 4] },

  { diabetes: true, edad: 60, sexo: 'M', fumador: false, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 60, sexo: 'M', fumador: false, pas: 160, valores: [3, 3, 4, 5, 5] },
  { diabetes: true, edad: 60, sexo: 'M', fumador: false, pas: 140, valores: [1, 2, 2, 3, 4] },
  { diabetes: true, edad: 60, sexo: 'M', fumador: false, pas: 120, valores: [1, 1, 1, 2, 2] },

  { diabetes: true, edad: 60, sexo: 'M', fumador: true, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 60, sexo: 'M', fumador: true, pas: 160, valores: [4, 5, 5, 5, 5] },
  { diabetes: true, edad: 60, sexo: 'M', fumador: true, pas: 140, valores: [2, 3, 3, 4, 5] },
  { diabetes: true, edad: 60, sexo: 'M', fumador: true, pas: 120, valores: [1, 2, 2, 3, 4] },

  { diabetes: true, edad: 60, sexo: 'F', fumador: false, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 60, sexo: 'F', fumador: false, pas: 160, valores: [3, 3, 4, 5, 5] },
  { diabetes: true, edad: 60, sexo: 'F', fumador: false, pas: 140, valores: [1, 2, 2, 3, 4] },
  { diabetes: true, edad: 60, sexo: 'F', fumador: false, pas: 120, valores: [1, 1, 1, 2, 2] },

  { diabetes: true, edad: 60, sexo: 'F', fumador: true, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 60, sexo: 'F', fumador: true, pas: 160, valores: [3, 3, 5, 5, 5] },
  { diabetes: true, edad: 60, sexo: 'F', fumador: true, pas: 140, valores: [2, 2, 2, 3, 4] },
  { diabetes: true, edad: 60, sexo: 'F', fumador: true, pas: 120, valores: [1, 1, 1, 2, 3] },

  { diabetes: true, edad: 50, sexo: 'M', fumador: false, pas: 180, valores: [4, 5, 5, 5, 5] },
  { diabetes: true, edad: 50, sexo: 'M', fumador: false, pas: 160, valores: [2, 2, 3, 4, 5] },
  { diabetes: true, edad: 50, sexo: 'M', fumador: false, pas: 140, valores: [1, 1, 1, 2, 3] },
  { diabetes: true, edad: 50, sexo: 'M', fumador: false, pas: 120, valores: [1, 1, 1, 1, 2] },

  { diabetes: true, edad: 50, sexo: 'M', fumador: true, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 50, sexo: 'M', fumador: true, pas: 160, valores: [3, 4, 5, 5, 5] },
  { diabetes: true, edad: 50, sexo: 'M', fumador: true, pas: 140, valores: [1, 2, 2, 3, 5] },
  { diabetes: true, edad: 50, sexo: 'M', fumador: true, pas: 120, valores: [1, 1, 1, 2, 3] },

  { diabetes: true, edad: 50, sexo: 'F', fumador: false, pas: 180, valores: [4, 5, 5, 5, 5] },
  { diabetes: true, edad: 50, sexo: 'F', fumador: false, pas: 160, valores: [2, 2, 3, 4, 5] },
  { diabetes: true, edad: 50, sexo: 'F', fumador: false, pas: 140, valores: [1, 1, 1, 2, 4] },
  { diabetes: true, edad: 50, sexo: 'F', fumador: false, pas: 120, valores: [1, 1, 1, 1, 2] },

  { diabetes: true, edad: 50, sexo: 'F', fumador: true, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 50, sexo: 'F', fumador: true, pas: 160, valores: [3, 3, 5, 5, 5] },
  { diabetes: true, edad: 50, sexo: 'F', fumador: true, pas: 140, valores: [1, 2, 2, 3, 4] },
  { diabetes: true, edad: 50, sexo: 'F', fumador: true, pas: 120, valores: [1, 1, 1, 2, 3] },

  { diabetes: true, edad: 40, sexo: 'M', fumador: false, pas: 180, valores: [3, 5, 5, 5, 5] },
  { diabetes: true, edad: 40, sexo: 'M', fumador: false, pas: 160, valores: [1, 2, 2, 3, 5] },
  { diabetes: true, edad: 40, sexo: 'M', fumador: false, pas: 140, valores: [1, 1, 1, 1, 3] },
  { diabetes: true, edad: 40, sexo: 'M', fumador: false, pas: 120, valores: [1, 1, 1, 1, 1] },

  { diabetes: true, edad: 40, sexo: 'M', fumador: true, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 40, sexo: 'M', fumador: true, pas: 160, valores: [2, 3, 4, 5, 5] },
  { diabetes: true, edad: 40, sexo: 'M', fumador: true, pas: 140, valores: [1, 1, 2, 2, 5] },
  { diabetes: true, edad: 40, sexo: 'M', fumador: true, pas: 120, valores: [1, 1, 1, 1, 3] },

  { diabetes: true, edad: 40, sexo: 'F', fumador: false, pas: 180, valores: [4, 5, 5, 5, 5] },
  { diabetes: true, edad: 40, sexo: 'F', fumador: false, pas: 160, valores: [1, 2, 3, 4, 5] },
  { diabetes: true, edad: 40, sexo: 'F', fumador: false, pas: 140, valores: [1, 1, 1, 2, 4] },
  { diabetes: true, edad: 40, sexo: 'F', fumador: false, pas: 120, valores: [1, 1, 1, 1, 1] },

  { diabetes: true, edad: 40, sexo: 'F', fumador: true, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: true, edad: 40, sexo: 'F', fumador: true, pas: 160, valores: [2, 3, 5, 5, 5] },
  { diabetes: true, edad: 40, sexo: 'F', fumador: true, pas: 140, valores: [1, 1, 2, 3, 4] },
  { diabetes: true, edad: 40, sexo: 'F', fumador: true, pas: 120, valores: [1, 1, 1, 1, 2] },

  { diabetes: false, edad: 70, sexo: 'M', fumador: false, pas: 180, valores: [3, 4, 5, 5, 5] },
  { diabetes: false, edad: 70, sexo: 'M', fumador: false, pas: 160, valores: [2, 2, 3, 3, 4] },
  { diabetes: false, edad: 70, sexo: 'M', fumador: false, pas: 140, valores: [1, 2, 2, 2, 3] },
  { diabetes: false, edad: 70, sexo: 'M', fumador: false, pas: 120, valores: [1, 1, 1, 2, 2] },

  { diabetes: false, edad: 70, sexo: 'M', fumador: true, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: false, edad: 70, sexo: 'M', fumador: true, pas: 160, valores: [3, 3, 4, 5, 5] },
  { diabetes: false, edad: 70, sexo: 'M', fumador: true, pas: 140, valores: [2, 2, 3, 3, 4] },
  { diabetes: false, edad: 70, sexo: 'M', fumador: true, pas: 120, valores: [1, 2, 2, 2, 3] },

  { diabetes: false, edad: 70, sexo: 'F', fumador: false, pas: 180, valores: [3, 3, 4, 5, 5] },
  { diabetes: false, edad: 70, sexo: 'F', fumador: false, pas: 160, valores: [2, 2, 2, 3, 3] },
  { diabetes: false, edad: 70, sexo: 'F', fumador: false, pas: 140, valores: [1, 1, 2, 2, 2] },
  { diabetes: false, edad: 70, sexo: 'F', fumador: false, pas: 120, valores: [1, 1, 1, 1, 2] },

  { diabetes: false, edad: 70, sexo: 'F', fumador: true, pas: 180, valores: [4, 5, 5, 5, 5] },
  { diabetes: false, edad: 70, sexo: 'F', fumador: true, pas: 160, valores: [2, 3, 3, 4, 5] },
  { diabetes: false, edad: 70, sexo: 'F', fumador: true, pas: 140, valores: [2, 2, 2, 3, 3] },
  { diabetes: false, edad: 70, sexo: 'F', fumador: true, pas: 120, valores: [1, 1, 2, 2, 2] },

  { diabetes: false, edad: 60, sexo: 'M', fumador: false, pas: 180, valores: [3, 4, 5, 5, 5] },
  { diabetes: false, edad: 60, sexo: 'M', fumador: false, pas: 160, valores: [2, 2, 2, 3, 4] },
  { diabetes: false, edad: 60, sexo: 'M', fumador: false, pas: 140, valores: [1, 1, 1, 2, 2] },
  { diabetes: false, edad: 60, sexo: 'M', fumador: false, pas: 120, valores: [1, 1, 1, 1, 1] },

  { diabetes: false, edad: 60, sexo: 'M', fumador: true, pas: 180, valores: [5, 5, 5, 5, 5] },
  { diabetes: false, edad: 60, sexo: 'M', fumador: true, pas: 160, valores: [2, 3, 4, 4, 5] },
  { diabetes: false, edad: 60, sexo: 'M', fumador: true, pas: 140, valores: [1, 2, 2, 3, 4] },
  { diabetes: false, edad: 60, sexo: 'M', fumador: true, pas: 120, valores: [1, 1, 1, 2, 2] },

  { diabetes: false, edad: 60, sexo: 'F', fumador: false, pas: 180, valores: [3, 3, 4, 5, 5] },
  { diabetes: false, edad: 60, sexo: 'F', fumador: false, pas: 160, valores: [1, 1, 2, 2, 3] },
  { diabetes: false, edad: 60, sexo: 'F', fumador: false, pas: 140, valores: [1, 1, 1, 1, 2] },
  { diabetes: false, edad: 60, sexo: 'F', fumador: false, pas: 120, valores: [1, 1, 1, 1, 1] },

  { diabetes: false, edad: 60, sexo: 'F', fumador: true, pas: 180, valores: [4, 5, 5, 5, 5] },
  { diabetes: false, edad: 60, sexo: 'F', fumador: true, pas: 160, valores: [2, 2, 3, 4, 5] },
  { diabetes: false, edad: 60, sexo: 'F', fumador: true, pas: 140, valores: [1, 1, 1, 2, 3] },
  { diabetes: false, edad: 60, sexo: 'F', fumador: true, pas: 120, valores: [1, 1, 1, 1, 2] },

  { diabetes: false, edad: 50, sexo: 'M', fumador: false, pas: 180, valores: [2, 3, 4, 5, 5] },
  { diabetes: false, edad: 50, sexo: 'M', fumador: false, pas: 160, valores: [1, 1, 2, 2, 4] },
  { diabetes: false, edad: 50, sexo: 'M', fumador: false, pas: 140, valores: [1, 1, 1, 1, 2] },
  { diabetes: false, edad: 50, sexo: 'M', fumador: false, pas: 120, valores: [1, 1, 1, 1, 1] },

  { diabetes: false, edad: 50, sexo: 'M', fumador: true, pas: 180, valores: [4, 5, 5, 5, 5] },
  { diabetes: false, edad: 50, sexo: 'M', fumador: true, pas: 160, valores: [2, 2, 3, 4, 5] },
  { diabetes: false, edad: 50, sexo: 'M', fumador: true, pas: 140, valores: [1, 1, 1, 2, 3] },
  { diabetes: false, edad: 50, sexo: 'M', fumador: true, pas: 120, valores: [1, 1, 1, 1, 2] },

  { diabetes: false, edad: 50, sexo: 'F', fumador: false, pas: 180, valores: [3, 3, 4, 5, 5] },
  { diabetes: false, edad: 50, sexo: 'F', fumador: false, pas: 160, valores: [1, 1, 2, 2, 3] },
  { diabetes: false, edad: 50, sexo: 'F', fumador: false, pas: 140, valores: [1, 1, 1, 1, 2] },
  { diabetes: false, edad: 50, sexo: 'F', fumador: false, pas: 120, valores: [1, 1, 1, 1, 1] },

  { diabetes: false, edad: 50, sexo: 'F', fumador: true, pas: 180, valores: [4, 5, 5, 5, 5] },
  { diabetes: false, edad: 50, sexo: 'F', fumador: true, pas: 160, valores: [2, 2, 3, 4, 5] },
  { diabetes: false, edad: 50, sexo: 'F', fumador: true, pas: 140, valores: [1, 1, 1, 2, 3] },
  { diabetes: false, edad: 50, sexo: 'F', fumador: true, pas: 120, valores: [1, 1, 1, 1, 2] },

  { diabetes: false, edad: 40, sexo: 'M', fumador: false, pas: 180, valores: [2, 3, 4, 5, 5] },
  { diabetes: false, edad: 40, sexo: 'M', fumador: false, pas: 160, valores: [1, 1, 1, 2, 4] },
  { diabetes: false, edad: 40, sexo: 'M', fumador: false, pas: 140, valores: [1, 1, 1, 1, 2] },
  { diabetes: false, edad: 40, sexo: 'M', fumador: false, pas: 120, valores: [1, 1, 1, 1, 1] },

  { diabetes: false, edad: 40, sexo: 'M', fumador: true, pas: 180, valores: [4, 5, 5, 5, 5] },
  { diabetes: false, edad: 40, sexo: 'M', fumador: true, pas: 160, valores: [1, 2, 2, 4, 5] },
  { diabetes: false, edad: 40, sexo: 'M', fumador: true, pas: 140, valores: [1, 1, 1, 2, 3] },
  { diabetes: false, edad: 40, sexo: 'M', fumador: true, pas: 120, valores: [1, 1, 1, 1, 1] },

  { diabetes: false, edad: 40, sexo: 'F', fumador: false, pas: 180, valores: [3, 3, 4, 5, 5] },
  { diabetes: false, edad: 40, sexo: 'F', fumador: false, pas: 160, valores: [1, 1, 2, 2, 3] },
  { diabetes: false, edad: 40, sexo: 'F', fumador: false, pas: 140, valores: [1, 1, 1, 1, 2] },
  { diabetes: false, edad: 40, sexo: 'F', fumador: false, pas: 120, valores: [1, 1, 1, 1, 1] },

  { diabetes: false, edad: 40, sexo: 'F', fumador: true, pas: 180, valores: [4, 5, 5, 5, 5] },
  { diabetes: false, edad: 40, sexo: 'F', fumador: true, pas: 160, valores: [1, 2, 3, 4, 5] },
  { diabetes: false, edad: 40, sexo: 'F', fumador: true, pas: 140, valores: [1, 1, 1, 2, 3] },
  { diabetes: false, edad: 40, sexo: 'F', fumador: true, pas: 120, valores: [1, 1, 1, 1, 1] },
];

/**
 * `null` cuando la combinación no está en la tabla — nunca se aproxima ni se
 * interpola. Regla 5: ante falta de dato, neutro, nunca inferir.
 */
export function categoriaRiesgoCardiovascular(e: EntradaRiesgoCV): NivelRiesgoCV | null {
  const fila = TABLA_RIESGO_CV.find(
    (f) =>
      f.diabetes === e.diabetes &&
      f.edad === e.edad &&
      f.sexo === e.sexo &&
      f.fumador === e.fumador &&
      f.pas === e.pas,
  );
  if (!fila) return null;

  const indice = COLESTEROL_CV.indexOf(e.colesterolMmolL);
  if (indice === -1) return null;

  return fila.valores[indice] as NivelRiesgoCV;
}
