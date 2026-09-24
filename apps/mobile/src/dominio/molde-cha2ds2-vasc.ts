import type { Molde, OpcionCampo } from '@gfh/shared-types';

/**
 * CHA₂DS₂-VASc, declarada contra el molde.
 *
 * `modo: 'cascada'` porque son siete criterios que se eligen tocando, mismo
 * motivo que HAS-BLED. `tipo: 'puntaje'` autosuma los `puntos` de cada campo
 * `opcion` — no hace falta `calcular`.
 *
 * El campo de edad es uno solo con tres bandas (no dos campos separados para
 * A y A2): la escala no pregunta "¿tenés 65-74?" y después "¿tenés 75+?" por
 * separado, pregunta la edad una vez y el tramo decide los puntos — mismo
 * patrón que el fixture genérico de `molde.test.ts`.
 *
 * Sexo femenino suma 1 punto siempre en esta declaración (así la define la
 * escala original). La salvedad clínica real —que 0 en hombre o 1 en mujer
 * "sólo por el punto de sexo" sigue siendo bajo riesgo— no se resuelve
 * ocultando el campo: se explica en `limite`, que es lo que el número no
 * dice por sí solo.
 */

const SI_NO: OpcionCampo[] = [
  { valor: 'si', etiqueta: 'Sí', puntos: 1 },
  { valor: 'no', etiqueta: 'No', puntos: 0 },
];

export function moldeCha2ds2Vasc(): Molde {
  return {
    clave: 'cha2ds2-vasc',
    titulo: 'CHA2DS2-VASc',
    formula: 'CHA₂DS₂-VASc · 7 criterios',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'icc',
        rotulo: 'C · Insuficiencia cardíaca o disfunción de VI',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'hipertension',
        rotulo: 'H · Hipertensión arterial',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'edad',
        rotulo: 'A · Edad',
        ayuda: '65-74 años suma 1 punto (A); 75 años o más suma 2 (A2).',
        opciones: [
          { valor: 'menor65', etiqueta: '< 65' },
          { valor: 'de65a74', etiqueta: '65 – 74', puntos: 1 },
          { valor: 'mayor75', etiqueta: '≥ 75', puntos: 2 },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'diabetes',
        rotulo: 'D · Diabetes mellitus',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'acv',
        rotulo: 'S2 · ACV, AIT o tromboembolismo previo',
        opciones: [
          { valor: 'si', etiqueta: 'Sí', puntos: 2 },
          { valor: 'no', etiqueta: 'No', puntos: 0 },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'vascular',
        rotulo: 'V · Enfermedad vascular',
        ayuda: 'IAM previo, enfermedad arterial periférica, o placa aórtica.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'sexoFemenino',
        rotulo: 'Sc · Sexo femenino',
        opciones: SI_NO,
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 9,
      tramos: [
        { hasta: 0, rotulo: 'Riesgo bajo de ACV', color: 'ok' },
        { hasta: 1, rotulo: 'Riesgo intermedio de ACV', color: 'media' },
        { hasta: 9, rotulo: 'Riesgo alto de ACV — anticoagulación recomendada', color: 'grave' },
      ],
    },
    limite:
      'El corte de "bajo riesgo" real es 0 en hombres o 1 en mujeres contando sólo el punto ' +
      'de sexo — este tramo no distingue eso: si el único punto sumado es el de sexo femenino, ' +
      'revisar antes de indicar anticoagulación por este resultado solo.',
  };
}
