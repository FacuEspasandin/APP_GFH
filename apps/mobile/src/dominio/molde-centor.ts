import type { Molde, OpcionCampo } from '@gfh/shared-types';

/**
 * Centor modificado por McIsaac, declarada contra el molde.
 *
 * `modo: 'cascada'`, cinco criterios. La edad puede restar un punto (McIsaac
 * 2004 sobre el Centor original de 1981) — `puntajeParcial`/`puntajeMaximo`
 * ya suman cualquier valor de `puntos`, incluido negativo, sin ajuste
 * especial: mismo mecanismo que Wells con medios puntos.
 */

const SI_NO: OpcionCampo[] = [
  { valor: 'si', etiqueta: 'Sí', puntos: 1 },
  { valor: 'no', etiqueta: 'No', puntos: 0 },
];

export function moldeCentor(): Molde {
  return {
    clave: 'centor',
    titulo: 'Centor (McIsaac)',
    formula: 'Centor-McIsaac · 4 criterios + edad',
    modo: 'cascada',
    campos: [
      { tipo: 'opcion', clave: 'exudado', rotulo: 'Exudado amigdalino', opciones: SI_NO },
      {
        tipo: 'opcion',
        clave: 'adenopatia',
        rotulo: 'Adenopatía cervical anterior dolorosa',
        opciones: SI_NO,
      },
      { tipo: 'opcion', clave: 'fiebre', rotulo: 'Fiebre (antecedente o medida)', opciones: SI_NO },
      { tipo: 'opcion', clave: 'sinTos', rotulo: 'Ausencia de tos', opciones: SI_NO },
      {
        tipo: 'opcion',
        clave: 'edad',
        rotulo: 'Edad',
        opciones: [
          { valor: '3a14', etiqueta: '3 a 14 años', puntos: 1 },
          { valor: '15a44', etiqueta: '15 a 44 años', puntos: 0 },
          { valor: 'mayor45', etiqueta: '45 años o más', puntos: -1 },
        ],
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 5,
      tramos: [
        { hasta: 1, rotulo: 'Probabilidad baja de estreptococo — no testear ni tratar', color: 'ok' },
        { hasta: 3, rotulo: 'Probabilidad moderada — considerar testeo rápido', color: 'media' },
        { hasta: 5, rotulo: 'Probabilidad alta — considerar testeo o tratamiento empírico', color: 'grave' },
      ],
    },
    limite:
      'Estima probabilidad de faringitis estreptocócica, no la diagnostica. No aplica a menores ' +
      'de 3 años, y no reemplaza el testeo (cultivo o antígeno rápido) donde esté disponible.',
    acercaDe:
      'Centor (1981), modificado por McIsaac (2004) sumando la edad, estima ' +
      'probabilidad de faringitis por estreptococo del grupo A a partir de ' +
      'cuatro signos clínicos, para decidir quién necesita testeo o ' +
      'antibiótico sin cultivarlos a todos.',
  };
}
