import type { Molde, OpcionCampo } from '@gfh/shared-types';

/**
 * Índice de Comorbilidad de Charlson, declarada contra el molde.
 *
 * `modo: 'cascada'`, diecinueve criterios en dieciséis campos —tres
 * agrupan su propia severidad en una sola pregunta de opciones, ver más
 * abajo— con pesos 1, 2, 3 o 6. La más larga después de NIHSS. Es la
 * versión original (Charlson et al.
 * 1987), sin el término de edad de la variante «ajustada por edad»: ese
 * ajuste tiene más de una convención publicada para los puntos por década, y
 * sumar uno propio inventaría un corte que la escala original no tiene.
 *
 * Hepática y renal declaran cada severidad como una opción separada (no un
 * selector de severidad dentro de un solo criterio) porque el molde autosuma
 * por `puntos` de la opción elegida — mismo mecanismo que el resto de las
 * escalas cascada.
 */
export function moldeCharlson(): Molde {
  const siNo = (puntos: number): OpcionCampo[] => [
    { valor: 'si', etiqueta: 'Sí', puntos },
    { valor: 'no', etiqueta: 'No', puntos: 0 },
  ];

  return {
    clave: 'charlson',
    titulo: 'Índice de Comorbilidad de Charlson',
    formula: 'Charlson · 19 criterios',
    modo: 'cascada',
    campos: [
      { tipo: 'opcion', clave: 'infartoMiocardio', rotulo: 'Infarto de miocardio', opciones: siNo(1) },
      {
        tipo: 'opcion',
        clave: 'insuficienciaCardiaca',
        rotulo: 'Insuficiencia cardíaca congestiva',
        opciones: siNo(1),
      },
      {
        tipo: 'opcion',
        clave: 'vascularPeriferica',
        rotulo: 'Enfermedad vascular periférica',
        opciones: siNo(1),
      },
      {
        tipo: 'opcion',
        clave: 'cerebrovascular',
        rotulo: 'Enfermedad cerebrovascular (ACV o AIT)',
        opciones: siNo(1),
      },
      { tipo: 'opcion', clave: 'demencia', rotulo: 'Demencia', opciones: siNo(1) },
      {
        tipo: 'opcion',
        clave: 'pulmonarCronica',
        rotulo: 'Enfermedad pulmonar crónica (EPOC)',
        opciones: siNo(1),
      },
      {
        tipo: 'opcion',
        clave: 'tejidoConectivo',
        rotulo: 'Enfermedad del tejido conectivo',
        opciones: siNo(1),
      },
      { tipo: 'opcion', clave: 'ulceraPeptica', rotulo: 'Úlcera péptica', opciones: siNo(1) },
      {
        tipo: 'opcion',
        clave: 'hepatica',
        rotulo: 'Enfermedad hepática',
        opciones: [
          { valor: 'ninguna', etiqueta: 'Ninguna', puntos: 0 },
          { valor: 'leve', etiqueta: 'Leve (hepatitis crónica, sin hipertensión portal)', puntos: 1 },
          { valor: 'moderadaGrave', etiqueta: 'Moderada a grave (cirrosis con hipertensión portal)', puntos: 3 },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'diabetes',
        rotulo: 'Diabetes mellitus',
        opciones: [
          { valor: 'ninguna', etiqueta: 'Ninguna', puntos: 0 },
          { valor: 'sinComplicaciones', etiqueta: 'Sin daño de órgano blanco', puntos: 1 },
          { valor: 'conComplicaciones', etiqueta: 'Con daño de órgano blanco (retinopatía, nefropatía, neuropatía)', puntos: 2 },
        ],
      },
      { tipo: 'opcion', clave: 'hemiplejia', rotulo: 'Hemiplejía', opciones: siNo(2) },
      {
        tipo: 'opcion',
        clave: 'renal',
        rotulo: 'Enfermedad renal moderada a grave',
        opciones: siNo(2),
      },
      {
        tipo: 'opcion',
        clave: 'tumorSolido',
        rotulo: 'Tumor sólido',
        opciones: [
          { valor: 'ninguno', etiqueta: 'Ninguno', puntos: 0 },
          { valor: 'localizado', etiqueta: 'Localizado, sin metástasis', puntos: 2 },
          { valor: 'metastasico', etiqueta: 'Metastásico', puntos: 6 },
        ],
      },
      { tipo: 'opcion', clave: 'leucemia', rotulo: 'Leucemia', opciones: siNo(2) },
      { tipo: 'opcion', clave: 'linfoma', rotulo: 'Linfoma', opciones: siNo(2) },
      { tipo: 'opcion', clave: 'sida', rotulo: 'SIDA', opciones: siNo(6) },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 33,
      tramos: [
        { hasta: 0, rotulo: 'Sin comorbilidad relevante — sobrevida a 10 años ~98%', color: 'ok' },
        { hasta: 2, rotulo: 'Comorbilidad baja — sobrevida a 10 años ~90%', color: 'ok' },
        { hasta: 4, rotulo: 'Comorbilidad moderada — sobrevida a 10 años ~53%', color: 'media' },
        { hasta: 33, rotulo: 'Comorbilidad alta — sobrevida a 10 años ~21%', color: 'grave' },
      ],
    },
    limite:
      'Los porcentajes de sobrevida son los de la cohorte original de 1987, no una predicción ' +
      'individual. No incluye la edad —eso es la variante «ajustada por edad», que esta pantalla ' +
      'no implementa— así que dos pacientes de edades muy distintas con el mismo puntaje no tienen ' +
      'necesariamente el mismo pronóstico real.',
    acercaDe:
      'El Índice de Charlson (1987) resume diecinueve comorbilidades en un ' +
      'solo número asociado a mortalidad a 10 años, pensado originalmente para ' +
      'ajustar estudios por comorbilidad y hoy usado también como referencia ' +
      'clínica rápida.',
  };
}
