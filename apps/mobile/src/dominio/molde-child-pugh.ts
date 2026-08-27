import {
  BANDAS_ALBUMINA,
  BANDAS_BILIRRUBINA,
  BANDAS_INR,
  NOMBRE_ASCITIS,
  NOMBRE_ENCEFALOPATIA,
  RANGOS,
  type Banda,
  type Molde,
  type OpcionCampo,
  type Punto,
} from '@gfh/shared-types';

import type { Borrador as BorradorHepatico } from './hepatico';

/**
 * Child-Pugh, declarada contra el molde.
 *
 * Es la primera calculadora que deja de ser una pantalla escrita a mano. Lo que
 * antes vivía en `ui/child-pugh.tsx` —524 líneas de formulario— pasa a ser esto
 * más el renderizador genérico.
 *
 * Nada clínico se redefine acá: las bandas, sus puntos y los nombres de los
 * grados salen de `@gfh/shared-types`, que es de donde ya salían. Esto sólo
 * dice cómo se pregunta.
 *
 * **`modo: 'cascada'`** porque son cinco criterios que se eligen tocando.
 * Abiertos de entrada eran tres pantallas de scroll antes de contestar nada.
 */

/** Las bandas del catálogo clínico, en la forma que el molde entiende.
 *
 *  El `valor` es el puntaje como texto y no el índice: así una banda significa
 *  lo mismo aunque alguna vez se reordenen, y el borrador guardado sigue
 *  valiendo. */
function comoOpciones(bandas: readonly Banda[]): OpcionCampo[] {
  return bandas.map((b) => ({
    valor: String(b.puntos),
    etiqueta: b.texto,
    puntos: b.puntos,
  }));
}

/**
 * El molde.
 *
 * `conValorExacto` decide si los tres de laboratorio piden además el número.
 * En la pantalla del paciente sí —el historial quiere poder decirlo— y en la
 * herramienta suelta no, porque descarta todo al salir y pedirlo sería pedir
 * por pedir.
 */
export function moldeChildPugh(conValorExacto: boolean): Molde {
  const exacto = (rotulo: string, rango: (typeof RANGOS)[keyof typeof RANGOS]) =>
    conValorExacto ? { rotulo, rango } : undefined;

  return {
    clave: 'child-pugh',
    titulo: 'Child-Pugh',
    formula: 'Child-Pugh · 5 criterios',
    modo: 'cascada',
    campos: [
      {
        tipo: 'opcion',
        clave: 'bilirrubina',
        rotulo: 'Bilirrubina total',
        opciones: comoOpciones(BANDAS_BILIRRUBINA['mg/dL']),
        unidades: [
          { valor: 'mg/dL', etiqueta: 'mg/dL', opciones: comoOpciones(BANDAS_BILIRRUBINA['mg/dL']) },
          { valor: 'umol/L', etiqueta: 'µmol/L', opciones: comoOpciones(BANDAS_BILIRRUBINA['umol/L']) },
        ],
        valorExacto: exacto('Valor exacto', RANGOS.bilirrubinaMgDl),
      },
      {
        tipo: 'opcion',
        clave: 'albumina',
        rotulo: 'Albúmina sérica',
        opciones: comoOpciones(BANDAS_ALBUMINA['g/dL']),
        unidades: [
          { valor: 'g/dL', etiqueta: 'g/dL', opciones: comoOpciones(BANDAS_ALBUMINA['g/dL']) },
          { valor: 'g/L', etiqueta: 'g/L', opciones: comoOpciones(BANDAS_ALBUMINA['g/L']) },
        ],
        valorExacto: exacto('Valor exacto', RANGOS.albuminaGDl),
      },
      {
        tipo: 'opcion',
        clave: 'inr',
        rotulo: 'INR',
        // Sin unidades: el INR es un cociente, no tiene.
        opciones: comoOpciones(BANDAS_INR),
        valorExacto: exacto('Valor exacto', RANGOS.inr),
      },
      {
        tipo: 'opcion',
        clave: 'ascitis',
        rotulo: 'Ascitis',
        opciones: [
          { valor: '1', etiqueta: NOMBRE_ASCITIS.AUSENTE, puntos: 1 },
          { valor: '2', etiqueta: NOMBRE_ASCITIS.LEVE, puntos: 2 },
          { valor: '3', etiqueta: NOMBRE_ASCITIS.MODERADA_SEVERA, puntos: 3 },
        ],
      },
      {
        tipo: 'opcion',
        clave: 'encefalopatia',
        rotulo: 'Encefalopatía',
        opciones: [
          { valor: '1', etiqueta: NOMBRE_ENCEFALOPATIA.AUSENTE, puntos: 1 },
          { valor: '2', etiqueta: NOMBRE_ENCEFALOPATIA.GRADO_1_2, puntos: 2 },
          { valor: '3', etiqueta: NOMBRE_ENCEFALOPATIA.GRADO_3_4, puntos: 3 },
        ],
      },
    ],
    resultado: {
      tipo: 'puntaje',
      maximo: 15,
      /*
       * Los cortes son los publicados: 5-6 clase A, 7-9 B, 10-15 C. El mínimo
       * es 5 y no 0 porque cada criterio suma al menos un punto — no existe un
       * Child-Pugh de 3.
       *
       * El color sale de la escala clínica: A es lo mejor que hay pero no es
       * «sin hallazgos», así que va neutro y no verde. Verde afirmaría que el
       * hígado está bien, y lo que dice es que la cirrosis está compensada.
       */
      tramos: [
        { hasta: 6, rotulo: 'Clase A · cirrosis compensada', color: 'neutro' },
        { hasta: 9, rotulo: 'Clase B · compromiso funcional significativo', color: 'media' },
        { hasta: 15, rotulo: 'Clase C · enfermedad hepática descompensada', color: 'grave' },
      ],
    },
    limite:
      'Cuánto ajustar cada fármaco. Falta la tabla de ajuste hepático por ' +
      'fármaco en el catálogo, así que la clase está pero no hay contra qué ' +
      'cruzarla todavía.',
  };
}

// ---------------------------------------------------------------------------
// Traducción con el borrador del dominio
// ---------------------------------------------------------------------------

/**
 * El molde habla en texto plano —`Record<string, string>`— y el dominio en
 * tipos. Traducir en un solo lugar evita que cada pantalla arme el suyo.
 *
 * Las claves del molde son las mismas que los criterios de Child-Pugh, así que
 * la traducción es directa; lo único con forma propia es el valor exacto, que
 * el molde guarda con sufijo `:exacto`.
 */

/** Del dominio al molde: lo que ya estaba guardado, para arrancar la pantalla. */
export function aBorradorDelMolde(b: BorradorHepatico): {
  borrador: Record<string, string>;
  unidades: Record<string, string>;
} {
  const borrador: Record<string, string> = {};
  const punto = (v: number | null) => (v === null ? undefined : String(v));

  for (const [clave, valor] of [
    ['bilirrubina', punto(b.bilirrubina)],
    ['albumina', punto(b.albumina)],
    ['inr', punto(b.inr)],
    ['ascitis', b.ascitis === null ? undefined : String(PUNTOS_ASCITIS[b.ascitis])],
    ['encefalopatia', b.encefalopatia === null ? undefined : String(PUNTOS_ENCEFALOPATIA[b.encefalopatia])],
    ['bilirrubina:exacto', b.bilirrubinaValor || undefined],
    ['albumina:exacto', b.albuminaValor || undefined],
    ['inr:exacto', b.inrValor || undefined],
  ] as const) {
    if (valor !== undefined) borrador[clave] = valor;
  }

  return {
    borrador,
    unidades: { bilirrubina: b.unidadBilirrubina, albumina: b.unidadAlbumina },
  };
}

/** Del molde al dominio: lo que el médico acaba de contestar, para guardarlo. */
export function desdeBorradorDelMolde(
  borrador: Readonly<Record<string, string | undefined>>,
  unidades: Readonly<Record<string, string | undefined>>,
): BorradorHepatico {
  const punto = (clave: string): Punto | null => {
    const v = borrador[clave];
    if (v !== '1' && v !== '2' && v !== '3') return null;
    return Number(v) as Punto;
  };

  const desdePuntos = <T extends string>(clave: string, mapa: Record<number, T>): T | null => {
    const p = punto(clave);
    return p === null ? null : (mapa[p] ?? null);
  };

  return {
    bilirrubina: punto('bilirrubina'),
    bilirrubinaValor: borrador['bilirrubina:exacto'] ?? '',
    unidadBilirrubina: (unidades.bilirrubina as BorradorHepatico['unidadBilirrubina']) ?? 'mg/dL',
    albumina: punto('albumina'),
    albuminaValor: borrador['albumina:exacto'] ?? '',
    unidadAlbumina: (unidades.albumina as BorradorHepatico['unidadAlbumina']) ?? 'g/dL',
    inr: punto('inr'),
    inrValor: borrador['inr:exacto'] ?? '',
    ascitis: desdePuntos('ascitis', ASCITIS_POR_PUNTOS),
    encefalopatia: desdePuntos('encefalopatia', ENCEFALOPATIA_POR_PUNTOS),
  };
}

/* Los grados se guardan como enum y se puntúan 1-3. Los dos mapas viven acá y
   no en la declaración porque son traducción, no forma de preguntar. */
const PUNTOS_ASCITIS = { AUSENTE: 1, LEVE: 2, MODERADA_SEVERA: 3 } as const;
const PUNTOS_ENCEFALOPATIA = { AUSENTE: 1, GRADO_1_2: 2, GRADO_3_4: 3 } as const;
const ASCITIS_POR_PUNTOS = { 1: 'AUSENTE', 2: 'LEVE', 3: 'MODERADA_SEVERA' } as const;
const ENCEFALOPATIA_POR_PUNTOS = { 1: 'AUSENTE', 2: 'GRADO_1_2', 3: 'GRADO_3_4' } as const;
