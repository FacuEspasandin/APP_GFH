import { RANGOS, type Molde, type OpcionCampo } from '@gfh/shared-types';

/**
 * Glasgow-Blatchford, declarada contra el molde.
 *
 * `modo: 'cascada'`, ocho criterios, todos con `puntos` fijos por opción —
 * mismo mecanismo de autosuma que Child-Pugh/SOFA, incluida la hemoglobina,
 * que en la escala publicada tiene cortes distintos por sexo: en vez de un
 * campo de sexo aparte que el molde no puede usar para condicionar otro
 * campo, las ocho combinaciones posibles quedan escritas explícitas en las
 * opciones (mismo motivo que llevó a fijar el color por escala en vez de
 * reusar la clínica en riesgo cardiovascular: el molde no ramifica un campo
 * según otro).
 *
 * La urea se pide en mg/dL —como el resto de la app, ver CURB-65/gap
 * osmolar— con los cortes de la escala (publicados en mmol/L) convertidos:
 * mmol/L × 6,006 ≈ mg/dL, mismo factor que usa `calcularGapOsmolarParaMolde`.
 */
export function moldeGlasgowBlatchford(): Molde {
  const siNo = (puntos: number): OpcionCampo[] => [
    { valor: 'si', etiqueta: 'Sí', puntos },
    { valor: 'no', etiqueta: 'No', puntos: 0 },
  ];

  return {
    clave: 'glasgow-blatchford',
    titulo: 'Glasgow-Blatchford',
    formula: 'Glasgow-Blatchford · 8 criterios',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'urea',
        rotulo: 'Urea',
        ayuda: 'Cortes de la escala publicada, convertidos de mmol/L a mg/dL.',
        opciones: [
          { valor: '0', etiqueta: 'Menor a 39 mg/dL (< 6,5 mmol/L)', puntos: 0 },
          { valor: '2', etiqueta: '39 a 47 mg/dL (6,5 a 7,9 mmol/L)', puntos: 2 },
          { valor: '3', etiqueta: '48 a 59 mg/dL (8,0 a 9,9 mmol/L)', puntos: 3 },
          { valor: '4', etiqueta: '60 a 149 mg/dL (10,0 a 24,9 mmol/L)', puntos: 4 },
          { valor: '6', etiqueta: '150 mg/dL o más (25 mmol/L o más)', puntos: 6 },
        ],
        valorExacto: { rotulo: 'Urea exacta (mg/dL)', rango: RANGOS.ureaMgDl },
      },
      {
        tipo: 'opcion',
        clave: 'hemoglobina',
        rotulo: 'Hemoglobina',
        opciones: [
          { valor: 'h0', etiqueta: 'Hombre: 13 g/dL o más', puntos: 0 },
          { valor: 'm0', etiqueta: 'Mujer: 12 g/dL o más', puntos: 0 },
          { valor: 'h1', etiqueta: 'Hombre: 12 a 12,9 g/dL', puntos: 1 },
          { valor: 'm1', etiqueta: 'Mujer: 10 a 11,9 g/dL', puntos: 1 },
          { valor: 'h3', etiqueta: 'Hombre: 10 a 11,9 g/dL', puntos: 3 },
          { valor: '6', etiqueta: 'Menor a 10 g/dL (cualquier sexo)', puntos: 6 },
        ],
        valorExacto: { rotulo: 'Hemoglobina exacta (g/dL)', rango: RANGOS.hemoglobinaGDl },
      },
      {
        tipo: 'opcion',
        clave: 'presionArterial',
        rotulo: 'Presión arterial sistólica',
        opciones: [
          { valor: '0', etiqueta: '110 mmHg o más', puntos: 0 },
          { valor: '1', etiqueta: '100 a 109 mmHg', puntos: 1 },
          { valor: '2', etiqueta: '90 a 99 mmHg', puntos: 2 },
          { valor: '3', etiqueta: 'Menor a 90 mmHg', puntos: 3 },
        ],
        valorExacto: { rotulo: 'PAS exacta (mmHg)', rango: RANGOS.pasMmHg },
      },
      {
        tipo: 'opcion',
        clave: 'frecuenciaCardiaca',
        rotulo: 'Frecuencia cardíaca de 100 por minuto o más',
        opciones: siNo(1),
      },
      { tipo: 'opcion', clave: 'melena', rotulo: 'Melena presente', opciones: siNo(1) },
      { tipo: 'opcion', clave: 'sincope', rotulo: 'Síncope', opciones: siNo(2) },
      {
        tipo: 'opcion',
        clave: 'hepatopatia',
        rotulo: 'Enfermedad hepática conocida',
        opciones: siNo(2),
      },
      {
        tipo: 'opcion',
        clave: 'insuficienciaCardiaca',
        rotulo: 'Insuficiencia cardíaca conocida',
        opciones: siNo(2),
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 23,
      tramos: [
        { hasta: 0, rotulo: 'Riesgo muy bajo — alta con seguimiento ambulatorio razonable', color: 'ok' },
        { hasta: 23, rotulo: 'Score mayor a 0 — evaluar transfusión, endoscopía o internación', color: 'grave' },
      ],
    },
    limite:
      'Sólo el corte de 0 está bien validado para decidir alta segura. Por encima de 0 el riesgo ' +
      'sigue aumentando con el puntaje, pero la escala no define tramos intermedios oficiales.',
    acercaDe:
      'Glasgow-Blatchford (2000) identifica, antes de la endoscopía, qué ' +
      'pacientes con hemorragia digestiva alta pueden manejarse ambulatorios ' +
      'con seguridad — un puntaje de 0 es el corte más validado de la escala.',
  };
}
