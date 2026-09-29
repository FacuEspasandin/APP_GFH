import type { Molde, OpcionCampo } from '@gfh/shared-types';

/**
 * Índice de Riesgo Cardíaco Revisado (Lee), declarada contra el molde.
 *
 * `modo: 'cascada'`, seis criterios Sí/No, mismo patrón que RCRI original
 * (Lee et al. 1999): cada uno vale 1 punto, sin pesos distintos.
 */

const SI_NO: OpcionCampo[] = [
  { valor: 'si', etiqueta: 'Sí', puntos: 1 },
  { valor: 'no', etiqueta: 'No', puntos: 0 },
];

export function moldeRcri(): Molde {
  return {
    clave: 'rcri',
    titulo: 'Índice de Riesgo Cardíaco Revisado',
    formula: 'RCRI (Lee) · 6 criterios',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'cirugiaAltoRiesgo',
        rotulo: 'Cirugía de alto riesgo',
        ayuda: 'Intraperitoneal, intratorácica, o vascular suprainguinal.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'cardiopatiaIsquemica',
        rotulo: 'Antecedente de cardiopatía isquémica',
        ayuda: 'IAM previo, angina, uso de nitratos, o ergometría patológica.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'insuficienciaCardiaca',
        rotulo: 'Antecedente de insuficiencia cardíaca',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'enfermedadCerebrovascular',
        rotulo: 'Antecedente de ACV o AIT',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'diabetesInsulina',
        rotulo: 'Diabetes tratada con insulina',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'creatininaElevada',
        rotulo: 'Creatinina mayor a 2,0 mg/dL',
        opciones: SI_NO,
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 6,
      tramos: [
        { hasta: 0, rotulo: 'Clase I · riesgo de evento cardíaco mayor ~0,4%', color: 'ok' },
        { hasta: 1, rotulo: 'Clase II · riesgo ~1%', color: 'ok' },
        { hasta: 2, rotulo: 'Clase III · riesgo ~7%', color: 'media' },
        { hasta: 6, rotulo: 'Clase IV · riesgo ~11% o más', color: 'grave' },
      ],
    },
    limite:
      'Estima riesgo cardíaco perioperatorio en cirugía no cardíaca, no en cirugía cardíaca. No ' +
      'incorpora la capacidad funcional del paciente ni el tipo exacto de procedimiento.',
    acercaDe:
      'El RCRI (Lee et al., 1999) estima riesgo de evento cardíaco mayor tras ' +
      'cirugía no cardíaca con seis factores fáciles de reunir en la ' +
      'evaluación preoperatoria, sin necesitar estudios adicionales.',
  };
}
