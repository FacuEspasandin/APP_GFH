import type { Molde, OpcionCampo } from '@gfh/shared-types';

/**
 * CURB-65, declarada contra el molde.
 *
 * `modo: 'cascada'`, cinco criterios Sí/No, mismo patrón que HAS-BLED. La
 * urea no se pide como número: en Uruguay se informa distinto según
 * laboratorio (urea vs nitrógeno ureico/BUN), y pedir un número obliga a un
 * selector de unidades para un solo campo. El corte queda en `ayuda`, igual
 * que HAS-BLED hace con la presión arterial ("PAS sostenida mayor a 160").
 */

const SI_NO: OpcionCampo[] = [
  { valor: 'si', etiqueta: 'Sí', puntos: 1 },
  { valor: 'no', etiqueta: 'No', puntos: 0 },
];

export function moldeCurb65(): Molde {
  return {
    clave: 'curb-65',
    titulo: 'CURB-65',
    formula: 'CURB-65 · 5 criterios',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'confusion',
        rotulo: 'C · Confusión',
        ayuda: 'Desorientación nueva en persona, lugar o tiempo.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'urea',
        rotulo: 'U · Urea elevada',
        ayuda: 'Urea mayor a 42 mg/dL, o nitrógeno ureico (BUN) mayor a 19 mg/dL.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'frecuenciaRespiratoria',
        rotulo: 'R · Frecuencia respiratoria alta',
        ayuda: '30 o más respiraciones por minuto.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'presionArterial',
        rotulo: 'B · Presión arterial baja',
        ayuda: 'Sistólica menor a 90 mmHg, o diastólica de 60 mmHg o menos.',
        opciones: SI_NO,
      },
      {
        tipo: 'opcion',
        clave: 'edad',
        rotulo: '65 · Edad de 65 años o más',
        opciones: SI_NO,
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 5,
      tramos: [
        { hasta: 1, rotulo: 'Riesgo bajo — tratamiento ambulatorio', color: 'ok' },
        { hasta: 2, rotulo: 'Riesgo intermedio — internación breve u observación estrecha', color: 'media' },
        { hasta: 5, rotulo: 'Riesgo alto — internación, UCI si 4 o 5', color: 'grave' },
      ],
    },
    limite:
      'Mortalidad a 30 días, no gravedad al momento de la consulta. No reemplaza el juicio ' +
      'clínico ni la saturación de oxígeno, que no forma parte de esta escala.',
    acercaDe:
      'CURB-65 (2003) estima mortalidad a 30 días en neumonía adquirida en la ' +
      'comunidad, con cinco criterios fáciles de obtener a la cabecera. Decide ' +
      'entre tratamiento ambulatorio, internación breve o UCI.',
  };
}
