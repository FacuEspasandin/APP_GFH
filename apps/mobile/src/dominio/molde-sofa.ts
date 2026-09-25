import { RANGOS, type Molde, type OpcionCampo } from '@gfh/shared-types';

/**
 * SOFA completo, declarada contra el molde.
 *
 * `modo: 'cascada'`, seis sistemas. Los cuatro que se apoyan en un valor de
 * laboratorio (respiratorio, coagulación, hepático, renal) siguen el mismo
 * patrón que Child-Pugh: se elige la banda publicada, y el número exacto es
 * opcional al lado —nunca cambia el puntaje, queda anotado para quien lo
 * lee—. Cardiovascular y neurológico son puramente categóricos y no lo
 * llevan.
 *
 * **Cardiovascular** trae una opción «No aplica» (fuera de UTI, sin datos
 * de vasopresores) que puntúa 0 — no es un caso especial del molde, es una
 * opción más, igual que hicieron HAS-BLED (INR lábil) y qSOFA. El `limite`
 * de abajo aclara que ese 0 es «sin dato», no «sin disfunción».
 *
 * **Neurológico** reusa las bandas de Glasgow como opciones directas — el
 * médico lee el total ya calculado en la pantalla de Glasgow y elige la
 * banda correspondiente acá, en vez de reabrir las tres preguntas
 * apertura/verbal/motora dentro de SOFA.
 *
 * `resultado.tipo: 'puntaje'` con un único tramo que cubre todo el rango:
 * el informe es explícito en que el SOFA no tiene una categoría fija como
 * HAS-BLED o Glasgow — lo que importa es la tendencia en el tiempo. Un solo
 * tramo ancho evita inventar cortes que la escala no tiene, sin caer en el
 * aviso genérico de «sin tramo declarado».
 */
export function moldeSofa(): Molde {
  const opcion = (valor: string, etiqueta: string, puntos: number): OpcionCampo => ({
    valor,
    etiqueta,
    puntos,
  });

  return {
    clave: 'sofa',
    titulo: 'SOFA completo',
    formula: 'SOFA · 6 sistemas, 0–4 puntos cada uno',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'respiratorio',
        rotulo: 'Respiratorio',
        ayuda: 'Relación PaO₂/FiO₂.',
        opciones: [
          opcion('0', 'PaO₂/FiO₂ ≥ 400', 0),
          opcion('1', 'PaO₂/FiO₂ < 400', 1),
          opcion('2', 'PaO₂/FiO₂ < 300', 2),
          opcion('3', 'PaO₂/FiO₂ < 200, con soporte respiratorio', 3),
          opcion('4', 'PaO₂/FiO₂ < 100, con soporte respiratorio', 4),
        ],
        valorExacto: { rotulo: 'PaO₂/FiO₂ exacto', rango: RANGOS.pao2Fio2 },
      },
      {
        tipo: 'opcion',
        clave: 'coagulacion',
        rotulo: 'Coagulación',
        ayuda: 'Recuento de plaquetas.',
        opciones: [
          opcion('0', 'Plaquetas ≥ 150.000/µL', 0),
          opcion('1', 'Plaquetas < 150.000/µL', 1),
          opcion('2', 'Plaquetas < 100.000/µL', 2),
          opcion('3', 'Plaquetas < 50.000/µL', 3),
          opcion('4', 'Plaquetas < 20.000/µL', 4),
        ],
        valorExacto: { rotulo: 'Plaquetas exactas (miles/µL)', rango: RANGOS.plaquetasMiles },
      },
      {
        tipo: 'opcion',
        clave: 'hepatico',
        rotulo: 'Hepático',
        ayuda: 'Bilirrubina total.',
        opciones: [
          opcion('0', 'Bilirrubina < 1,2 mg/dL', 0),
          opcion('1', 'Bilirrubina 1,2 – 1,9 mg/dL', 1),
          opcion('2', 'Bilirrubina 2,0 – 5,9 mg/dL', 2),
          opcion('3', 'Bilirrubina 6,0 – 11,9 mg/dL', 3),
          opcion('4', 'Bilirrubina > 12,0 mg/dL', 4),
        ],
        valorExacto: { rotulo: 'Bilirrubina exacta (mg/dL)', rango: RANGOS.bilirrubinaMgDl },
      },
      {
        tipo: 'opcion',
        clave: 'cardiovascular',
        rotulo: 'Cardiovascular',
        ayuda: 'Presión arterial media (PAM) o vasopresores.',
        opciones: [
          opcion('0', 'PAM ≥ 70 mmHg', 0),
          opcion('1', 'PAM < 70 mmHg', 1),
          opcion('2', 'Dopamina < 5, o dobutamina a cualquier dosis', 2),
          opcion('3', 'Dopamina 5,1 – 15, o noradrenalina/adrenalina ≤ 0,1 µg/kg/min', 3),
          opcion('4', 'Dopamina > 15, o noradrenalina/adrenalina > 0,1 µg/kg/min', 4),
          opcion('na', 'No aplica — sin datos de vasopresores disponibles', 0),
        ],
      },
      {
        tipo: 'opcion',
        clave: 'neurologico',
        rotulo: 'Neurológico',
        ayuda: 'Puntaje total de Glasgow (E + V + M), ya calculado.',
        opciones: [
          opcion('0', 'Glasgow 15', 0),
          opcion('1', 'Glasgow 13 – 14', 1),
          opcion('2', 'Glasgow 10 – 12', 2),
          opcion('3', 'Glasgow 6 – 9', 3),
          opcion('4', 'Glasgow < 6', 4),
        ],
      },
      {
        tipo: 'opcion',
        clave: 'renal',
        rotulo: 'Renal',
        ayuda: 'Creatinina, o diuresis si no hay creatinina reciente.',
        opciones: [
          opcion('0', 'Creatinina < 1,2 mg/dL', 0),
          opcion('1', 'Creatinina 1,2 – 1,9 mg/dL', 1),
          opcion('2', 'Creatinina 2,0 – 3,4 mg/dL', 2),
          opcion('3', 'Creatinina 3,5 – 4,9 mg/dL, o diuresis < 500 mL/día', 3),
          opcion('4', 'Creatinina > 5,0 mg/dL, o diuresis < 200 mL/día', 4),
        ],
        valorExacto: { rotulo: 'Creatinina exacta (mg/dL)', rango: RANGOS.creatininaMgDl },
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 24,
      tramos: [
        {
          hasta: 24,
          rotulo: 'Seguimiento evolutivo — importa la tendencia en el tiempo, no el número aislado',
          color: 'neutro',
        },
      ],
    },
    limite:
      'No tiene una categoría de riesgo fija: un aumento de 2 o más puntos desde el basal, con ' +
      'infección sospechada o confirmada, es parte de la definición de sepsis (Sepsis-3). ' +
      '«No aplica» en cardiovascular cuenta como 0 en el total — es la ausencia del dato, no la ' +
      'ausencia de disfunción.',
    acercaDe:
      'SOFA (1996) cuantifica disfunción orgánica en seis sistemas y es la ' +
      'base de la definición actual de sepsis (Sepsis-3): un aumento de 2 o ' +
      'más puntos con infección sospechada define sepsis. qSOFA es su versión ' +
      'rápida de screening.',
  };
}
