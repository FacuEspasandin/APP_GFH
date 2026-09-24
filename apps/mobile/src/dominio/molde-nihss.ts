import type { Molde, OpcionCampo } from '@gfh/shared-types';

/**
 * NIHSS, declarada contra el molde.
 *
 * `modo: 'cascada'`: quince criterios que se eligen, no se escriben — mismo
 * motivo que HAS-BLED, sólo que acá son quince pasos en vez de nueve. Es la
 * calculadora más larga de las que existen hoy y no se acorta sin perder
 * validez: los quince ítems son los que la escala publicada mide.
 *
 * Los ítems 5a/5b (motor de brazo) y 6a/6b (motor de pierna) y el de ataxia
 * tienen una opción «No aplica» (amputación, fusión articular, paciente no
 * coopera) que no suma — mismo patrón que el «No aplica» de INR lábil en
 * HAS-BLED. El de disartria tiene «No aplica» por intubación o barrera
 * física, mismo criterio.
 */

function opciones(...pares: readonly [string, string, number?][]): OpcionCampo[] {
  return pares.map(([valor, etiqueta, puntos]) => ({ valor, etiqueta, puntos }));
}

export function moldeNihss(): Molde {
  return {
    clave: 'nihss',
    titulo: 'NIHSS',
    formula: 'NIH Stroke Scale · 15 ítems',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'concienciaNivel',
        rotulo: '1a · Nivel de conciencia',
        opciones: opciones(['0', 'Alerta', 0], ['1', 'Somnoliento', 1], ['2', 'Estupor', 2], ['3', 'Coma', 3]),
      },
      {
        tipo: 'opcion',
        clave: 'concienciaPreguntas',
        rotulo: '1b · Preguntas de orientación (mes, edad)',
        opciones: opciones(['0', 'Ambas correctas', 0], ['1', 'Una correcta', 1], ['2', 'Ninguna correcta', 2]),
      },
      {
        tipo: 'opcion',
        clave: 'concienciaOrdenes',
        rotulo: '1c · Órdenes (abrir/cerrar ojos, empuñar mano)',
        opciones: opciones(['0', 'Ambas correctas', 0], ['1', 'Una correcta', 1], ['2', 'Ninguna correcta', 2]),
      },
      {
        tipo: 'opcion',
        clave: 'mirada',
        rotulo: '2 · Mejor mirada',
        opciones: opciones(['0', 'Normal', 0], ['1', 'Parálisis parcial', 1], ['2', 'Desviación forzada', 2]),
      },
      {
        tipo: 'opcion',
        clave: 'camposVisuales',
        rotulo: '3 · Campos visuales',
        opciones: opciones(
          ['0', 'Sin pérdida', 0],
          ['1', 'Hemianopsia parcial', 1],
          ['2', 'Hemianopsia completa', 2],
          ['3', 'Ceguera bilateral', 3],
        ),
      },
      {
        tipo: 'opcion',
        clave: 'paresiaFacial',
        rotulo: '4 · Paresia facial',
        opciones: opciones(
          ['0', 'Normal', 0],
          ['1', 'Paresia menor', 1],
          ['2', 'Paresia parcial', 2],
          ['3', 'Parálisis completa', 3],
        ),
      },
      {
        tipo: 'opcion',
        clave: 'motorBrazoIzquierdo',
        rotulo: '5a · Motor brazo izquierdo',
        opciones: opciones(
          ['0', 'Sin claudicar', 0],
          ['1', 'Claudica antes de 10s', 1],
          ['2', 'Algo vs. gravedad', 2],
          ['3', 'No vence gravedad', 3],
          ['4', 'Sin movimiento', 4],
          ['na', 'No aplica (amputación/fusión)', 0],
        ),
      },
      {
        tipo: 'opcion',
        clave: 'motorBrazoDerecho',
        rotulo: '5b · Motor brazo derecho',
        opciones: opciones(
          ['0', 'Sin claudicar', 0],
          ['1', 'Claudica antes de 10s', 1],
          ['2', 'Algo vs. gravedad', 2],
          ['3', 'No vence gravedad', 3],
          ['4', 'Sin movimiento', 4],
          ['na', 'No aplica (amputación/fusión)', 0],
        ),
      },
      {
        tipo: 'opcion',
        clave: 'motorPiernaIzquierda',
        rotulo: '6a · Motor pierna izquierda',
        opciones: opciones(
          ['0', 'Sin claudicar', 0],
          ['1', 'Claudica antes de 5s', 1],
          ['2', 'Algo vs. gravedad', 2],
          ['3', 'No vence gravedad', 3],
          ['4', 'Sin movimiento', 4],
          ['na', 'No aplica (amputación/fusión)', 0],
        ),
      },
      {
        tipo: 'opcion',
        clave: 'motorPiernaDerecha',
        rotulo: '6b · Motor pierna derecha',
        opciones: opciones(
          ['0', 'Sin claudicar', 0],
          ['1', 'Claudica antes de 5s', 1],
          ['2', 'Algo vs. gravedad', 2],
          ['3', 'No vence gravedad', 3],
          ['4', 'Sin movimiento', 4],
          ['na', 'No aplica (amputación/fusión)', 0],
        ),
      },
      {
        tipo: 'opcion',
        clave: 'ataxia',
        rotulo: '7 · Ataxia de miembros',
        opciones: opciones(
          ['0', 'Ausente', 0],
          ['1', 'Presente en 1 miembro', 1],
          ['2', 'Presente en 2 miembros', 2],
          ['na', 'No aplica (amputación, no coopera)', 0],
        ),
      },
      {
        tipo: 'opcion',
        clave: 'sensibilidad',
        rotulo: '8 · Sensibilidad',
        opciones: opciones(['0', 'Normal', 0], ['1', 'Pérdida leve a moderada', 1], ['2', 'Pérdida severa a total', 2]),
      },
      {
        tipo: 'opcion',
        clave: 'lenguaje',
        rotulo: '9 · Mejor lenguaje',
        opciones: opciones(
          ['0', 'Sin afasia', 0],
          ['1', 'Afasia leve a moderada', 1],
          ['2', 'Afasia severa', 2],
          ['3', 'Mudo o afasia global', 3],
        ),
      },
      {
        tipo: 'opcion',
        clave: 'disartria',
        rotulo: '10 · Disartria',
        opciones: opciones(
          ['0', 'Normal', 0],
          ['1', 'Leve a moderada', 1],
          ['2', 'Severa (ininteligible)', 2],
          ['na', 'No aplica (intubado, barrera física)', 0],
        ),
      },
      {
        tipo: 'opcion',
        clave: 'extincionInatencion',
        rotulo: '11 · Extinción e inatención',
        opciones: opciones(
          ['0', 'Sin anormalidad', 0],
          ['1', 'Inatención o extinción en una modalidad', 1],
          ['2', 'Hemi-inatención severa o en más de una modalidad', 2],
        ),
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 42,
      tramos: [
        { hasta: 4, rotulo: 'ACV leve', color: 'ok' },
        { hasta: 15, rotulo: 'ACV moderado', color: 'media' },
        { hasta: 42, rotulo: 'ACV severo', color: 'grave' },
      ],
    },
    limite:
      'Mide déficit neurológico, no pronóstico funcional a largo plazo. Se repite en el tiempo ' +
      'para seguir evolución, no es un número que se toma una sola vez.',
  };
}
