import {
  categoriaRiesgoCardiovascular,
  COLOR_RIESGO_CV,
  ETIQUETA_RIESGO_CV,
  FUENTE_RIESGO_CV,
  PORCENTAJE_RIESGO_CV,
  type ColesterolBandaCV,
  type EdadBandaCV,
  type Molde,
  type NivelRiesgoCV,
  type PasBandaCV,
} from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Riesgo cardiovascular a 10 años, declarado contra el molde.
 *
 * Tercera calculadora en cascada, después de Child-Pugh. Las seis preguntas
 * son todas de elegir entre pocas —nada de escribir un número— porque la
 * tabla WHO/ISH sólo define 4 edades, 4 presiones y 5 colesteroles: pedir el
 * valor exacto invitaría a un dato más fino del que la tabla puede usar.
 *
 * El resultado NO es un tramo de puntaje: la combinación se busca directo en
 * `categoriaRiesgoCardiovascular` (tabla publicada, no fórmula), por eso el
 * molde usa `resultado.tipo: 'categoria'` con `calcular` haciendo la
 * búsqueda — mismo mecanismo que ya usa el anillo del Clcr para su fórmula.
 *
 * Libre y sin red, igual que Clcr y Child-Pugh: no cruza el catálogo, así
 * que no hay nada que consuma suscripción acá.
 */
export function moldeRiesgoCV(): Molde {
  return {
    clave: 'riesgo-cv',
    titulo: 'Riesgo cardiovascular a 10 años',
    formula: 'WHO/ISH, subregión AMR B (OMS/OPS)',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'sexo',
        rotulo: 'Sexo biológico',
        opciones: [
          { valor: 'M', etiqueta: 'Hombre' },
          { valor: 'F', etiqueta: 'Mujer' },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'edad',
        rotulo: 'Edad',
        ayuda: 'La tabla agrupa de a 10 años.',
        opciones: [
          { valor: '40', etiqueta: '40-49' },
          { valor: '50', etiqueta: '50-59' },
          { valor: '60', etiqueta: '60-69' },
          { valor: '70', etiqueta: '70 o más' },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'fumador',
        rotulo: '¿Fuma actualmente?',
        opciones: [
          { valor: 'no', etiqueta: 'No' },
          { valor: 'si', etiqueta: 'Sí' },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'diabetes',
        rotulo: '¿Tiene diabetes mellitus?',
        ayuda: 'La tabla trae una versión completa para cada caso.',
        opciones: [
          { valor: 'no', etiqueta: 'No' },
          { valor: 'si', etiqueta: 'Sí' },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'pas',
        rotulo: 'Presión arterial sistólica',
        ayuda: 'mmHg',
        opciones: [
          { valor: '120', etiqueta: '120' },
          { valor: '140', etiqueta: '140' },
          { valor: '160', etiqueta: '160' },
          { valor: '180', etiqueta: '180' },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'colesterol',
        rotulo: 'Colesterol total',
        ayuda: 'mmol/L — dividir mg/dL por 38,6 si hace falta.',
        opciones: [
          { valor: '4', etiqueta: '4' },
          { valor: '5', etiqueta: '5' },
          { valor: '6', etiqueta: '6' },
          { valor: '7', etiqueta: '7' },
          { valor: '8', etiqueta: '8' },
        ],
      },
    ],
    resultado: {
      tipo: 'categoria',
      tramos: ([1, 2, 3, 4, 5] as const).map((n) => ({
        hasta: n,
        rotulo: `${ETIQUETA_RIESGO_CV[n]} · ${PORCENTAJE_RIESGO_CV[n]}`,
        color: COLOR_RIESGO_CV[n],
      })),
    },
    limite:
      'Esta tabla no reemplaza el juicio clínico. Factores que no entran acá ' +
      '—obesidad, sedentarismo, antecedentes familiares— pueden subir el ' +
      `riesgo real por encima de lo que dice acá. Fuente: ${FUENTE_RIESGO_CV}.`,
  };
}

/**
 * La función pura: no suma puntos, busca en la tabla publicada.
 *
 * Devuelve `null` —anillo/categoría lo pintan gris, no rojo— si falta algo o
 * si la combinación no tiene fila en la tabla. Esto último no debería pasar
 * nunca con los seis campos declarados arriba, todos acotados a las bandas
 * que la tabla cubre.
 */
export function calcularRiesgoCVParaMolde(b: Record<string, string | undefined>): Record<string, Cifra> {
  const sexo = b.sexo;
  const edad = b.edad;
  const fumador = b.fumador;
  const diabetes = b.diabetes;
  const pas = b.pas;
  const colesterol = b.colesterol;

  if (
    (sexo !== 'M' && sexo !== 'F') ||
    edad === undefined ||
    (fumador !== 'si' && fumador !== 'no') ||
    (diabetes !== 'si' && diabetes !== 'no') ||
    pas === undefined ||
    colesterol === undefined
  ) {
    return { valor: { valor: null } };
  }

  const nivel: NivelRiesgoCV | null = categoriaRiesgoCardiovascular({
    sexo,
    edad: Number(edad) as EdadBandaCV,
    fumador: fumador === 'si',
    diabetes: diabetes === 'si',
    pas: Number(pas) as PasBandaCV,
    colesterolMmolL: Number(colesterol) as ColesterolBandaCV,
  });

  return { valor: { valor: nivel } };
}
