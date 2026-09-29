import type { Molde } from '@gfh/shared-types';

/**
 * HEART score, declarada contra el molde.
 *
 * `modo: 'cascada'`, cinco criterios de 0 a 2 puntos cada uno. La troponina
 * se pregunta como múltiplo del límite superior normal del laboratorio, no
 * como valor absoluto — así está diseñada la escala publicada, para que
 * sirva con cualquier ensayo sin declarar un corte propio.
 */
export function moldeHeart(): Molde {
  return {
    clave: 'heart',
    titulo: 'HEART score',
    formula: 'HEART · 5 criterios, 0–2 puntos cada uno',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'historia',
        rotulo: 'H · Historia clínica',
        opciones: [
          { valor: '0', etiqueta: 'Poco sugestiva', puntos: 0 },
          { valor: '1', etiqueta: 'Moderadamente sugestiva', puntos: 1 },
          { valor: '2', etiqueta: 'Muy sugestiva', puntos: 2 },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'ecg',
        rotulo: 'E · Electrocardiograma',
        opciones: [
          { valor: '0', etiqueta: 'Normal', puntos: 0 },
          { valor: '1', etiqueta: 'Alteración de repolarización inespecífica', puntos: 1 },
          { valor: '2', etiqueta: 'Desviación significativa del ST', puntos: 2 },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'edad',
        rotulo: 'A · Edad',
        opciones: [
          { valor: '0', etiqueta: 'Menor a 45 años', puntos: 0 },
          { valor: '1', etiqueta: '45 a 64 años', puntos: 1 },
          { valor: '2', etiqueta: '65 años o más', puntos: 2 },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'factoresRiesgo',
        rotulo: 'R · Factores de riesgo cardiovascular',
        ayuda: 'HTA, dislipemia, diabetes, tabaquismo, obesidad, antecedente familiar, o enfermedad aterosclerótica ya conocida.',
        opciones: [
          { valor: '0', etiqueta: 'Ninguno', puntos: 0 },
          { valor: '1', etiqueta: '1 o 2 factores', puntos: 1 },
          { valor: '2', etiqueta: '3 o más factores, o enfermedad aterosclerótica conocida', puntos: 2 },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'troponina',
        rotulo: 'T · Troponina',
        ayuda: 'Como múltiplo del límite superior normal del laboratorio, no el valor absoluto.',
        opciones: [
          { valor: '0', etiqueta: '≤ límite normal', puntos: 0 },
          { valor: '1', etiqueta: '1 a 3 veces el límite normal', puntos: 1 },
          { valor: '2', etiqueta: 'Más de 3 veces el límite normal', puntos: 2 },
        ],
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 10,
      tramos: [
        { hasta: 3, rotulo: 'Riesgo bajo de evento mayor a 6 semanas (~1-2%)', color: 'ok' },
        { hasta: 6, rotulo: 'Riesgo moderado de evento mayor a 6 semanas (~12-17%)', color: 'media' },
        { hasta: 10, rotulo: 'Riesgo alto de evento mayor a 6 semanas (~50-65%)', color: 'grave' },
      ],
    },
    limite:
      'Estima riesgo en dolor torácico ya evaluado en emergencia, no reemplaza el ECG ni la ' +
      'troponina seriada. No está validado para SCA ya confirmado por ECG (elevación del ST).',
    acercaDe:
      'El HEART score (2008) estratifica riesgo de evento cardíaco mayor en ' +
      'pacientes que llegan a emergencia con dolor torácico, para decidir ' +
      'entre alta, observación o estudio invasivo sin internar a todos por igual.',
  };
}
