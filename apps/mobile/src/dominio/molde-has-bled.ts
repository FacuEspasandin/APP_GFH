import type { Molde, OpcionCampo } from '@gfh/shared-types';

/**
 * HAS-BLED, declarada contra el molde.
 *
 * `modo: 'cascada'` porque son nueve criterios que se eligen tocando, mismo
 * motivo que Child-Pugh. `tipo: 'puntaje'` autosuma los `puntos` de cada
 * campo `opcion` — no hace falta `calcular`.
 *
 * Los nueve puntos son independientes en la tabla publicada (no hay «un
 * campo con dos sub-ítems»): A cubre renal e hepática por separado, D cubre
 * fármacos y alcohol por separado, y cada uno vale 0 o 1.
 *
 * El criterio L (INR lábil) trae una tercera opción, «No aplica», para
 * quien usa un anticoagulante de acción directa — no es un caso especial
 * del molde, es una opción más con `puntos: 0`, igual que cualquier «No»
 * de esta lista.
 */

const SI_NO: OpcionCampo[] = [
  { valor: 'si', etiqueta: 'Sí', puntos: 1 },
  { valor: 'no', etiqueta: 'No', puntos: 0 },
];

export function moldeHasBled(): Molde {
  return {
    clave: 'has-bled',
    titulo: 'HAS-BLED',
    formula: 'HAS-BLED · 9 criterios',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'hipertension',
        rotulo: 'H · Hipertensión no controlada',
        ayuda: 'PAS sostenida mayor a 160 mmHg.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'renal',
        rotulo: 'A · Función renal anormal',
        ayuda: 'Diálisis, trasplante renal, o creatinina sérica mayor a 200 µmol/L (~2,26 mg/dL).',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'hepatica',
        rotulo: 'A · Función hepática anormal',
        ayuda:
          'Enfermedad hepática crónica (ej. cirrosis), o bilirrubina mayor a 2 veces el límite ' +
          'superior normal junto con AST/ALT/FA mayor a 3 veces el límite superior normal.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'acv',
        rotulo: 'S · Antecedente de ACV',
        ayuda: 'Cualquier accidente cerebrovascular previo, isquémico o hemorrágico.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'sangrado',
        rotulo: 'B · Sangrado previo',
        ayuda: 'Sangrado mayor previo, o predisposición al sangrado (ej. anemia).',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'inrLabil',
        rotulo: 'L · INR lábil',
        ayuda:
          'Tiempo en rango terapéutico menor a 60%, o INR inestable. Sólo aplica con ' +
          'warfarina o acenocumarol.',
        opciones: [
          { valor: 'si', etiqueta: 'Sí', puntos: 1 },
          { valor: 'no', etiqueta: 'No', puntos: 0 },
          { valor: 'na', etiqueta: 'No aplica (anticoagulante de acción directa)', puntos: 0 },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'edad',
        rotulo: 'E · Edad mayor a 65 años',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'farmacos',
        rotulo: 'D · Antiagregantes o AINEs',
        ayuda: 'Uso concomitante de antiagregantes plaquetarios o AINEs.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'alcohol',
        rotulo: 'D · Alcohol',
        ayuda: 'Consumo de 8 o más unidades por semana.',
        opciones: SI_NO,
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 9,
      tramos: [
        { hasta: 2, rotulo: 'Riesgo bajo/moderado de sangrado mayor', color: 'ok' },
        { hasta: 9, rotulo: 'Riesgo alto de sangrado mayor', color: 'grave' },
      ],
    },
    limite:
      'No contraindica anticoagular por sí solo. Identifica y ayuda a corregir factores ' +
      'de riesgo modificables, y orienta la frecuencia de seguimiento.',
  };
}

/**
 * Los tres criterios que se pueden corregir, para que la pantalla arme la
 * lista de «a corregir» sin duplicar este mapeo. Los otros seis (renal,
 * hepática, ACV, sangrado previo, INR lábil, edad) no son modificables.
 */
export const FACTORES_MODIFICABLES_HAS_BLED: readonly { clave: string; rotulo: string }[] = [
  { clave: 'hipertension', rotulo: 'Controlar la presión arterial' },
  { clave: 'farmacos', rotulo: 'Evitar antiagregantes o AINEs concomitantes' },
  { clave: 'alcohol', rotulo: 'Reducir el consumo de alcohol' },
];
