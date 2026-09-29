import type { Molde, OpcionCampo } from '@gfh/shared-types';

/**
 * ABCD2, declarada contra el molde.
 *
 * `modo: 'cascada'`, cinco criterios, mismo patrón que HAS-BLED. Edad y
 * presión arterial se preguntan como Sí/No de un umbral fijo, no como número:
 * la escala publicada no pide el valor exacto, sólo si supera el corte —
 * mismo criterio que CURB-65 con la presión arterial.
 */

const SI_NO = (puntos: number): OpcionCampo[] => [
  { valor: 'si', etiqueta: 'Sí', puntos },
  { valor: 'no', etiqueta: 'No', puntos: 0 },
];

export function moldeAbcd2(): Molde {
  return {
    clave: 'abcd2',
    titulo: 'ABCD2',
    formula: 'ABCD2 · 5 criterios',
    modo: 'cascada',
    campos: [
      { tipo: 'opcion', clave: 'edad', rotulo: 'A · Edad de 60 años o más', opciones: SI_NO(1) },
      {
        tipo: 'opcion',
        clave: 'presionArterial',
        rotulo: 'B · Presión arterial ≥ 140/90 mmHg',
        ayuda: 'Al momento de la evaluación inicial.',
        opciones: SI_NO(1),
      },
      {
        tipo: 'opcion',
        clave: 'clinica',
        rotulo: 'C · Características clínicas',
        opciones: [
          { valor: 'debilidad', etiqueta: 'Debilidad unilateral', puntos: 2 },
          { valor: 'habla', etiqueta: 'Alteración del habla sin debilidad', puntos: 1 },
          { valor: 'otro', etiqueta: 'Otro síntoma', puntos: 0 },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'duracion',
        rotulo: 'D · Duración de los síntomas',
        opciones: [
          { valor: 'mayor60', etiqueta: '60 minutos o más', puntos: 2 },
          { valor: '10a59', etiqueta: '10 a 59 minutos', puntos: 1 },
          { valor: 'menor10', etiqueta: 'Menos de 10 minutos', puntos: 0 },
        ],
      },
      { tipo: 'opcion', clave: 'diabetes', rotulo: 'D · Diabetes mellitus', opciones: SI_NO(1) },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 7,
      tramos: [
        { hasta: 3, rotulo: 'Riesgo bajo de ACV a 2 días (~1%)', color: 'ok' },
        { hasta: 5, rotulo: 'Riesgo moderado de ACV a 2 días (~4%)', color: 'media' },
        { hasta: 7, rotulo: 'Riesgo alto de ACV a 2 días (~8%)', color: 'grave' },
      ],
    },
    limite:
      'Estima riesgo a corto plazo después de un AIT ya diagnosticado — no reemplaza la ' +
      'evaluación que hace ese diagnóstico. Un ABCD2 bajo no descarta AIT ni evita la ' +
      'evaluación urgente si la sospecha clínica es alta.',
    acercaDe:
      'ABCD2 (2007) estima el riesgo de ACV en los dos días posteriores a un ' +
      'accidente isquémico transitorio, para decidir qué pacientes necesitan ' +
      'estudio y observación urgente en vez de seguimiento ambulatorio.',
  };
}
