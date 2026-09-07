/**
 * Meta terapéutica de colesterol LDL y no-HDL según riesgo cardiovascular —
 * Guía Nacional para el Abordaje de las Dislipemias en el Adulto (Uruguay,
 * GEG), pág. 29-30.
 *
 * Reusa la categoría que ya calcula `categoriaRiesgoCardiovascular`: Bajo,
 * Alto, Muy alto y Crítico tienen meta fija; Moderado se ramifica según tres
 * condiciones de la guía, unidas por «alguna de» — LDL basal alto, HTA con
 * hipertrofia ventricular izquierda, o (edad/sexo + otro factor asociado).
 *
 * No incluye la nota de la fuente sobre «algunas guías recomiendan <50 mg/dl»
 * para muy alto/crítico — es una alternativa que menciona el documento, no
 * la recomendación del GEG, y se deja afuera a pedido explícito.
 */

import type { NivelRiesgoCV, SexoRiesgoCV } from './riesgo-cardiovascular';
import type { EdadBandaCV } from './riesgo-cardiovascular';

export const FUENTE_META_LDL_CV =
  'Guía Nacional para el Abordaje de las Dislipemias en el Adulto (Uruguay, GEG)';

/**
 * Sólo hacen falta para categoría Moderado. En las demás, la meta es fija y
 * estos tres campos no se usan — por eso son opcionales y no un objeto
 * aparte: pedir un objeto vacío en Bajo/Alto/Muy alto/Crítico sería ruido.
 */
export interface EntradaMetaLdl {
  categoria: NivelRiesgoCV;
  sexo: SexoRiesgoCV;
  edad: EdadBandaCV;
  /** Colesterol LDL basal ≥ 130 mg/dl. */
  ldlBasalAlto?: boolean;
  /** Hipertensión arterial con hipertrofia ventricular izquierda. */
  htaConHvi?: boolean;
  /** cHDL descendido, glicemia de ayuno alterada, o circunferencia abdominal
   *  aumentada (>94 cm hombres, >90 cm mujeres) — alguna de las tres. Sólo
   *  cuenta si además cumple el umbral de edad por sexo (ver `UMBRAL_EDAD_SEXO`). */
  otroFactorAsociado?: boolean;
}

export interface MetaLdl {
  ldlMgDl: number;
  /** Siempre `ldlMgDl + 30`, la única regla de la guía que no depende de la categoría. */
  noHdlMgDl: number;
  /** Sólo en Alto/Muy alto/Crítico: la guía pide reducción porcentual además del valor absoluto. */
  reduccionPorcentualMinima?: number;
}

/** Hombres ≥50 años o mujeres ≥60 — el umbral de edad de la condición B. */
const UMBRAL_EDAD_SEXO: Record<SexoRiesgoCV, number> = { M: 50, F: 60 };

/**
 * `null` sólo si `categoria` no es uno de los cinco niveles válidos — en la
 * práctica no debería pasar nunca, porque `NivelRiesgoCV` ya lo acota.
 */
export function metaLdlCardiovascular(e: EntradaMetaLdl): MetaLdl | null {
  const conNoHdl = (ldlMgDl: number, reduccionPorcentualMinima?: number): MetaLdl => ({
    ldlMgDl,
    noHdlMgDl: ldlMgDl + 30,
    reduccionPorcentualMinima,
  });

  switch (e.categoria) {
    case 1:
      return conNoHdl(130);
    case 3:
    case 4:
    case 5:
      return conNoHdl(70, 50);
    case 2: {
      const cumpleEdadSexo = e.edad >= UMBRAL_EDAD_SEXO[e.sexo];
      const condicionEdadSexo = cumpleEdadSexo && Boolean(e.otroFactorAsociado);
      const algunaCondicion = Boolean(e.ldlBasalAlto) || condicionEdadSexo || Boolean(e.htaConHvi);
      return algunaCondicion ? conNoHdl(70) : conNoHdl(100);
    }
    default:
      return null;
  }
}
