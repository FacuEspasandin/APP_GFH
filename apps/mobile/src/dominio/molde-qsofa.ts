import type { Molde, OpcionCampo } from '@gfh/shared-types';

/**
 * qSOFA, declarada contra el molde.
 *
 * `modo: 'cascada'`, tres preguntas sí/no. El ítem del sensorio pregunta
 * directo «¿Glasgow < 15?» en vez de abrir el selector completo de
 * apertura/verbal/motora — es screening a la cabecera, y reabrir las tres
 * preguntas de Glasgow acá le sacaría la rapidez que es la razón de ser de
 * esta herramienta. El selector completo vive en la pantalla de Glasgow y,
 * con más detalle, dentro de SOFA.
 */
export function moldeQsofa(): Molde {
  const siNo: OpcionCampo[] = [
    { valor: 'si', etiqueta: 'Sí', puntos: 1 },
    { valor: 'no', etiqueta: 'No', puntos: 0 },
  ];

  return {
    clave: 'qsofa',
    titulo: 'qSOFA',
    formula: 'qSOFA · 3 criterios',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'frecuenciaRespiratoria',
        rotulo: 'Frecuencia respiratoria ≥ 22 rpm',
        opciones: siNo,
      },
      {
        tipo: 'opcion',
        clave: 'sensorio',
        rotulo: 'Alteración del sensorio',
        ayuda: 'Glasgow menor a 15.',
        opciones: siNo,
      },
      {
        tipo: 'opcion',
        clave: 'presionArterial',
        rotulo: 'Presión arterial sistólica ≤ 100 mmHg',
        opciones: siNo,
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 3,
      tramos: [
        { hasta: 1, rotulo: 'Bajo riesgo', color: 'ok' },
        { hasta: 3, rotulo: 'Mayor riesgo — evaluar lactato, hemocultivos, SOFA completo', color: 'grave' },
      ],
    },
    limite:
      'No es diagnóstico de sepsis por sí solo — es una alerta de screening que indica evaluación ' +
      'más profunda.',
    acercaDe:
      'qSOFA (Sepsis-3, 2016) identifica en segundos, fuera de UTI, qué ' +
      'pacientes con sospecha de infección tienen mayor riesgo de mal ' +
      'desenlace y ameritan escalar a un SOFA completo.',
  };
}
