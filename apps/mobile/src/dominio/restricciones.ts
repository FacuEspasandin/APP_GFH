/**
 * El detalle de cada restricción, para las sub-pantallas del fármaco.
 *
 * El RESUMEN —estado y glosa de las cuatro tarjetas— se mudó a
 * `@gfh/shared-types`: desde el freemium lo calcula el BACKEND, porque la ficha
 * libre manda el resumen y se guarda el detalle para el endpoint que consume
 * cupo. Si la app siguiera resumiendo, la ficha tendría que mandarle las
 * alertas y las tablas completas y el muro se saltearía leyendo la respuesta.
 *
 * Lo que queda propio de la app es lo que dibuja cada sub-pantalla sobre la
 * respuesta del detalle: los tramos de la escala renal, los trimestres y los
 * peldaños de Child-Pugh. El servidor no los necesita.
 */
export {
  estadoDeAlertas,
  glosaRenal,
  menorPorcentaje,
  porcentajes,
  restriccionesDe,
  type AlertaFicha,
  type ClaveRestriccion,
  type DatosFicha,
  type EstadoRestriccion,
  type Restriccion,
  type TablaRenalFicha,
} from '@gfh/shared-types';

import {
  estadoDeAlertas,
  porcentajes,
  type AlertaFicha,
  type EstadoRestriccion,
  type TablaRenalFicha,
} from '@gfh/shared-types';

// --- embarazo: los tres trimestres -------------------------------------------

export interface Trimestre {
  numero: 1 | 2 | 3;
  nombre: string;
  desde: number;
  hasta: number;
  estado: EstadoRestriccion;
  texto: string | null;
}

const TRIMESTRES = [
  { numero: 1 as const, nombre: 'Primer trimestre', desde: 1, hasta: 13 },
  { numero: 2 as const, nombre: 'Segundo trimestre', desde: 14, hasta: 27 },
  { numero: 3 as const, nombre: 'Tercer trimestre', desde: 28, hasta: 40 },
];

/**
 * Las alertas de embarazo, repartidas en los tres trimestres.
 *
 * El catálogo las guarda con rango de semanas —o sin rango, que significa «todo
 * el embarazo»—. Una alerta «después del primer trimestre» cubre el segundo y
 * el tercero, y se muestra abierta en los dos: es lo que hace el motor cuando
 * filtra por la semana del paciente. Repartirla no agrega contenido clínico,
 * sólo lo pone donde se busca.
 */
export function porTrimestre(alertas: readonly AlertaFicha[]): Trimestre[] {
  return TRIMESTRES.map((t) => {
    const suyas = alertas.filter((a) => alcanza(a, t.desde, t.hasta));
    return {
      ...t,
      estado: estadoDeAlertas(suyas),
      texto: suyas.length === 0 ? null : peorTexto(suyas),
    };
  });
}

/** Una alerta sin rango cubre todo el embarazo. */
function alcanza(a: AlertaFicha, desde: number, hasta: number): boolean {
  const min = a.semanaMin ?? 1;
  const max = a.semanaMax ?? 45;
  return min <= hasta && max >= desde;
}

function peorTexto(alertas: readonly AlertaFicha[]): string {
  const grave = alertas.find((a) => a.severidad === 'EVITAR');
  return (grave ?? alertas[0]!).texto;
}

// --- renal: los tramos de la escala ------------------------------------------

export interface TramoRenal {
  rango: string;
  recomendacion: string;
  /**
   * Lo que la barra NO puede mostrar.
   *
   * La recomendación del catálogo suele ser sólo el porcentaje —«75–50%»— y
   * eso ya está dibujado y escrito adentro de la barra. Repetirlo abajo es
   * ruido. Lo que sí importa es la letra chica: «Control litemia estricto».
   * `null` cuando no hay nada más que el número.
   */
  nota: string | null;
  /** Para dibujar la barra: qué porción de la dosis queda. `null` si no es un %. */
  minimo: number | null;
  maximo: number | null;
  estado: EstadoRestriccion;
}

/**
 * Los tramos de una tabla renal, listos para dibujar.
 *
 * `minimo` y `maximo` salen del texto: «75–50 %» son dos números y la barra se
 * dibuja sólida hasta el mínimo y clara hasta el máximo. Pintar el promedio
 * sería inventar un valor que el catálogo no da.
 */
export function tramosRenales(tabla: TablaRenalFicha): TramoRenal[] {
  const tramos: TramoRenal[] = tabla.rangos.map((r) => {
    const nums = porcentajes(r.textoRecomendacion);
    const minimo = nums.length === 0 ? null : Math.min(...nums);
    const maximo = nums.length === 0 ? null : Math.max(...nums);

    return {
      rango: r.rangoTexto,
      recomendacion: r.textoRecomendacion ?? 'Sin recomendación cargada.',
      nota: notaDe(r.textoRecomendacion, nums.length > 0),
      minimo,
      maximo,
      // Sin ajuste es lo único que se pinta verde, y sólo cuando el catálogo lo
      // afirma con un 100 %. La ausencia de dato nunca es verde.
      estado: minimo !== null && minimo >= 100 ? 'ok' : 'precaucion',
    };
  });

  if (tabla.suplementoHd) {
    tramos.push({
      rango: 'Hemodiálisis',
      recomendacion: tabla.suplementoHd,
      nota: tabla.suplementoHd,
      minimo: null,
      maximo: null,
      estado: 'precaucion',
    });
  }

  return tramos;
}

/**
 * Le saca al texto los porcentajes que la barra ya muestra.
 *
 * «50-25% (Control litemia estricto)» deja «Control litemia estricto».
 * «100,00%» deja `null`: no queda nada que agregar.
 *
 * Si el tramo no traía porcentaje —«cada 18 h»— se devuelve entero: ahí la
 * barra no dice nada y el texto es todo lo que hay.
 */
function notaDe(texto: string | null, teniaPorcentaje: boolean): string | null {
  if (!texto) return null;
  if (!teniaPorcentaje) return texto;

  const limpio = texto
    .replace(/\d+(?:[.,]\d+)?\s*(?:[-–—]\s*\d+(?:[.,]\d+)?)?\s*%/g, '')
    .replace(/^[\s(),.;:-]+|[\s(),.;:-]+$/g, '')
    .trim();

  return limpio.length === 0 ? null : limpio;
}


// --- hepático: los tres peldaños ---------------------------------------------

export interface Peldano {
  clase: 'A' | 'B' | 'C';
  nombre: string;
  texto: string | null;
  estado: EstadoRestriccion;
}

/**
 * Los tres peldaños de Child-Pugh.
 *
 * Hoy salen los tres vacíos porque no hay tabla hepática para ningún fármaco.
 * Se muestran igual, con el peldaño punteado: que la pregunta exista y la
 * respuesta falte es información. Esconderlos haría creer que no hace falta
 * ajustar.
 */
export function peldanosHepaticos(
  filas: readonly { clase: string; texto: string | null; severidad?: string }[] = [],
): Peldano[] {
  const NOMBRES = {
    A: 'Insuficiencia leve',
    B: 'Insuficiencia moderada',
    C: 'Insuficiencia grave',
  } as const;

  return (['A', 'B', 'C'] as const).map((clase) => {
    const fila = filas.find((f) => f.clase === clase);
    if (!fila) {
      return { clase, nombre: NOMBRES[clase], texto: null, estado: 'sindato' as const };
    }
    return {
      clase,
      nombre: NOMBRES[clase],
      texto: fila.texto,
      estado:
        fila.severidad === 'EVITAR'
          ? ('evitar' as const)
          : fila.severidad === 'PRECAUCION'
            ? ('precaucion' as const)
            : ('ok' as const),
    };
  });
}

// --- nombres ------------------------------------------------------------------

/**
 * Devuelve un nombre de fármaco presentable.
 *
 * El catálogo de interacciones guarda los pares normalizados —minúsculas y sin
 * tildes— porque así los compara. Eso sirve para el motor y no para la
 * pantalla: «clonixino lisina» al lado de «Ibuprofeno» se ve como un error de
 * carga.
 *
 * Se capitaliza cada palabra salvo las cortas de unión, que en un nombre
 * comercial van en minúscula: «Ácido acetilsalicílico», no «Ácido
 * Acetilsalicílico».
 */
const SIN_CAPITALIZAR = new Set(['de', 'del', 'la', 'el', 'y', 'con', 'en']);

export function nombreLegible(nombre: string): string {
  return nombre
    .split(' ')
    .map((palabra, i) => {
      if (palabra.length === 0) return palabra;
      if (i > 0 && SIN_CAPITALIZAR.has(palabra.toLowerCase())) return palabra.toLowerCase();
      return palabra[0]!.toUpperCase() + palabra.slice(1);
    })
    .join(' ');
}

/**
 * El nombre de una familia terapéutica.
 *
 * Vienen del archivo de reglas en mayúscula sostenida —AINES, IECA, TIAZIDAS—.
 * Las siglas se quedan así porque lo son; las palabras completas pasan a caja
 * normal, que es como se leen.
 */
export function nombreFamilia(familia: string): string {
  const esSigla = familia.length <= 5 && familia === familia.toUpperCase();
  return esSigla ? familia : nombreLegible(familia.toLowerCase());
}
