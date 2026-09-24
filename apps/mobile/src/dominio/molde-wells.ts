import type { Molde, OpcionCampo } from '@gfh/shared-types';

/**
 * Wells (TEP), declarada contra el molde.
 *
 * `modo: 'cascada'`, mismo motivo que HAS-BLED y CHA₂DS₂-VASc. `tipo:
 * 'puntaje'` autosuma los `puntos` de cada campo — acá con pesos distintos
 * por criterio (1, 1,5 y 3), no 0/1 parejo: `puntajeParcial` y
 * `puntajeMaximo` ya suman cualquier valor de `puntos`, no hace falta nada
 * especial por tener medios puntos.
 *
 * Corte de 3 niveles (bajo/moderado/alto), no el dicotómico
 * (probable/improbable) — mismo criterio que ya usan HAS-BLED y qSOFA en la
 * app.
 */

const SI_NO = (puntos: number): OpcionCampo[] => [
  { valor: 'si', etiqueta: 'Sí', puntos },
  { valor: 'no', etiqueta: 'No', puntos: 0 },
];

export function moldeWells(): Molde {
  return {
    clave: 'wells',
    titulo: 'Wells (TEP)',
    formula: 'Wells · probabilidad clínica de TEP',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'signosTvp',
        rotulo: 'Signos clínicos de TVP',
        ayuda: 'Edema y dolor a la palpación de venas profundas de una pierna.',
        opciones: SI_NO(3),
      },
      {
        tipo: 'opcion',
        clave: 'diagnosticoAlternativo',
        rotulo: 'TEP es el diagnóstico más probable',
        ayuda: 'Comparado con cualquier otro diagnóstico alternativo.',
        opciones: SI_NO(3),
      },
      {
        tipo: 'opcion',
        clave: 'frecuenciaCardiaca',
        rotulo: 'Frecuencia cardíaca mayor a 100 por minuto',
        opciones: SI_NO(1.5),
      },
      {
        tipo: 'opcion',
        clave: 'inmovilizacion',
        rotulo: 'Inmovilización o cirugía, últimas 4 semanas',
        opciones: SI_NO(1.5),
      },
      {
        tipo: 'opcion',
        clave: 'tvpTepPrevio',
        rotulo: 'TVP o TEP previo',
        opciones: SI_NO(1.5),
      },
      {
        tipo: 'opcion',
        clave: 'hemoptisis',
        rotulo: 'Hemoptisis',
        opciones: SI_NO(1),
      },
      {
        tipo: 'opcion',
        clave: 'cancerActivo',
        rotulo: 'Cáncer activo',
        ayuda: 'Tratamiento en curso, o en los últimos 6 meses, o paliativo.',
        opciones: SI_NO(1),
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 12.5,
      tramos: [
        { hasta: 1.5, rotulo: 'Probabilidad clínica baja de TEP', color: 'ok' },
        { hasta: 6, rotulo: 'Probabilidad clínica moderada de TEP', color: 'media' },
        { hasta: 12.5, rotulo: 'Probabilidad clínica alta de TEP', color: 'grave' },
      ],
    },
    limite:
      'No reemplaza dímero-D ni imagen. Orienta el siguiente paso —dímero-D en bajo/moderado, ' +
      'angio-TC directo en alto— no diagnostica TEP por sí sola.',
  };
}
