import { tramoDe, type Borrador, type Molde, type Tramo, type Unidades } from '@gfh/shared-types';

import type { Cifra } from '@/ui/calculadora';

/**
 * Escala de Glasgow (GCS), declarada contra el molde.
 *
 * `modo: 'cascada'`: tres criterios que se eligen tocando, con el texto
 * completo de cada opción visible (nunca sólo el número) — mismo motivo que
 * Child-Pugh.
 *
 * `resultado.tipo: 'cifras'` con una sola cifra, no `'puntaje'`. La razón es
 * el caso intubado: cuando la verbal no es evaluable, el estándar clínico es
 * mostrar el resultado parcial («E4 V(NT) M6»), nunca sumar un valor
 * inventado. Un `'puntaje'` autosuma sin poder distinguir esa opción de
 * cualquier otra, así que terminaría mostrando una categoría falsa sobre un
 * total que no es real. `'cifras'` ya tiene el mecanismo correcto para esto
 * —`Cifra.porQueNo`, «con estos datos la fórmula no aplica»— así que
 * `calcularGlasgowParaMolde` lo reusa en vez de inventar uno nuevo.
 *
 * Cada `valor` de opción es el puntaje como texto (mismo patrón que
 * Child-Pugh con ascitis/encefalopatía): la traducción a número es directa
 * y no hace falta un mapa aparte.
 */
export function moldeGlasgow(): Molde {
  return {
    clave: 'glasgow',
    titulo: 'Escala de Glasgow',
    formula: 'GCS = apertura ocular + respuesta verbal + respuesta motora',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'apertura',
        rotulo: 'Apertura ocular',
        opciones: [
          { valor: '4', etiqueta: 'Espontánea' },
          { valor: '3', etiqueta: 'Al estímulo verbal (a la voz)' },
          { valor: '2', etiqueta: 'Al estímulo doloroso' },
          { valor: '1', etiqueta: 'Ninguna respuesta' },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'verbal',
        rotulo: 'Respuesta verbal',
        opciones: [
          { valor: '5', etiqueta: 'Orientado (sabe quién es, dónde está, cuándo)' },
          { valor: '4', etiqueta: 'Confuso / desorientado, pero conversa' },
          { valor: '3', etiqueta: 'Palabras inapropiadas (reconocibles, sin conversación coherente)' },
          { valor: '2', etiqueta: 'Sonidos incomprensibles (gemidos, sin palabras)' },
          { valor: '1', etiqueta: 'Ninguna respuesta verbal' },
          { valor: 'nt', etiqueta: 'No evaluable (paciente intubado)' },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'motora',
        rotulo: 'Respuesta motora',
        opciones: [
          { valor: '6', etiqueta: 'Obedece órdenes' },
          { valor: '5', etiqueta: 'Localiza el dolor' },
          { valor: '4', etiqueta: 'Retirada al dolor (flexión normal/inespecífica)' },
          { valor: '3', etiqueta: 'Flexión anormal (postura de decorticación)' },
          { valor: '2', etiqueta: 'Extensión anormal (postura de descerebración)' },
          { valor: '1', etiqueta: 'Ninguna respuesta motora' },
        ],
      },
    ],
    resultado: {
      tipo: 'cifras',
      cifras: [{ clave: 'total', rotulo: 'Puntaje total', unidad: 'puntos (3–15)' }],
    },
    limite:
      'Con la verbal no evaluable (intubado), el total no se calcula — se anota E y M por ' +
      'separado, sin inventar un valor verbal. No reemplaza una evaluación neurológica completa.',
    acercaDe:
      'La escala de Glasgow (Teasdale y Jennett, 1974) mide nivel de conciencia ' +
      'sumando tres respuestas — ocular, verbal, motora — en un lenguaje ' +
      'común entre servicios. Es la base de qSOFA y de la parte neurológica ' +
      'de SOFA.',
  };
}

export function calcularGlasgowParaMolde(b: Borrador, _u: Unidades): Record<string, Cifra> {
  const apertura = b.apertura ? Number(b.apertura) : undefined;
  const motora = b.motora ? Number(b.motora) : undefined;
  const verbal = b.verbal;

  if (apertura === undefined || motora === undefined || verbal === undefined) {
    return { total: { valor: null } };
  }

  if (verbal === 'nt') {
    return {
      total: {
        valor: null,
        porQueNo: `E${apertura} V(NT) M${motora} — verbal no evaluable, no se suma un valor inventado`,
      },
    };
  }

  return { total: { valor: apertura + Number(verbal) + motora } };
}

const TRAMOS_GLASGOW: readonly Tramo[] = [
  { hasta: 8, rotulo: 'Severo', color: 'grave' },
  { hasta: 12, rotulo: 'Moderado', color: 'media' },
  { hasta: 15, rotulo: 'Leve', color: 'ok' },
];

/** Sólo tiene sentido llamarla con un total real — con verbal no evaluable no
 *  hay puntaje que clasificar, y la pantalla no debería llamarla en ese caso. */
export function categoriaGlasgow(total: number): Tramo | null {
  return tramoDe(TRAMOS_GLASGOW, total);
}
