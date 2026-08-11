import {
  peorRango,
  RANGO_ETIQUETA,
  type CategoriaHallazgo,
  type RangoGravedad,
} from '@gfh/shared-types';

/**
 * Lo que el cockpit dice de un paciente, sin React de por medio.
 *
 * Vive acá y no dentro de la pantalla porque son las frases que el médico lee
 * primero —el veredicto, el desglose— y equivocarse en el plural o en la
 * categoría es equivocarse en la respuesta. Con la lógica en un `.tsx` no hay
 * forma de probarlas.
 */

export interface HallazgoResumible {
  categoria: CategoriaHallazgo;
  rango: RangoGravedad;
}

/** Sustantivo por categoría, para que el titular diga de qué se trata. */
const SUSTANTIVO: Record<CategoriaHallazgo, [string, string]> = {
  INTERACCION: ['interacción', 'interacciones'],
  CONDICION: ['alerta', 'alertas'],
  AJUSTE_RENAL: ['ajuste renal', 'ajustes renales'],
  AJUSTE_HEPATICO: ['ajuste hepático', 'ajustes hepáticos'],
};

/**
 * Femenino: concuerda con "interacción" y "alerta", que son las dos categorías
 * que aparecen como lo peor casi siempre. `RANGO_ETIQUETA` es masculino porque
 * describe un hallazgo, y "1 interacción contraindicado" no es español.
 */
const ADJETIVO: Record<RangoGravedad, [string, string]> = {
  0: ['contraindicada', 'contraindicadas'],
  1: ['grave', 'graves'],
  2: ['de atención', 'de atención'],
  3: ['informativa', 'informativas'],
};

/** El titular: la peor gravedad y cuántos hallazgos hay de ésa. */
export function titularCockpit(hallazgos: readonly HallazgoResumible[]): string {
  const peor = peorRango(hallazgos.map((h) => h.rango));
  if (peor === null) return 'Sin hallazgos';

  const deEsaGravedad = hallazgos.filter((h) => h.rango === peor);
  const n = deEsaGravedad.length;
  const [singular, plural] = SUSTANTIVO[deEsaGravedad[0]!.categoria];
  const [adjSingular, adjPlural] = ADJETIVO[peor];

  return n === 1 ? `1 ${singular} ${adjSingular}` : `${n} ${plural} ${adjPlural}`;
}

/**
 * El desglose, para no perder lo que las tarjetas de categoría ya no repiten.
 *
 * Sin hallazgos dice explícitamente que el silencio no es seguridad: es la
 * regla 5 aplicada a la frase que más se lee de la app.
 */
export function detalleCockpit(hallazgos: readonly HallazgoResumible[]): string {
  if (hallazgos.length === 0) {
    return 'Ningún fármaco del tratamiento dispara alertas con los datos cargados. No es lo mismo que decir que sea seguro.';
  }

  const partes = ([0, 1, 2, 3] as RangoGravedad[])
    .map((r) => ({ r, n: hallazgos.filter((h) => h.rango === r).length }))
    .filter((x) => x.n > 0)
    // Rango 2 se lee "de atención": "5 atención" no es español.
    .map((x) =>
      x.r === 2
        ? `${x.n} de atención`
        : `${x.n} ${RANGO_ETIQUETA[x.r].toLowerCase()}${x.n > 1 ? 's' : ''}`,
    );

  const total = hallazgos.length;
  return `${total} ${total === 1 ? 'hallazgo' : 'hallazgos'} en total: ${partes.join(', ')}.`;
}

/**
 * El peor rango de cada categoría, para teñir su tarjeta.
 *
 * Ausente = la categoría no tiene ninguno. Se distingue de "rango 3" a
 * propósito: informativo es un hallazgo, la ausencia no.
 */
export function peoresPorCategoria(
  hallazgos: readonly HallazgoResumible[],
): Partial<Record<CategoriaHallazgo, RangoGravedad>> {
  const salida: Partial<Record<CategoriaHallazgo, RangoGravedad>> = {};

  for (const h of hallazgos) {
    const actual = salida[h.categoria];
    if (actual === undefined || h.rango < actual) salida[h.categoria] = h.rango;
  }

  return salida;
}

/**
 * Los hallazgos que suben al cockpit: los más graves primero, cortados.
 *
 * El resto se pide. Volcar catorce seguidos es una pared donde no se distingue
 * lo grave de lo informativo; no mostrar ninguno obliga a entrar a una
 * categoría para leer siquiera uno.
 */
export function destacados<T extends HallazgoResumible>(
  hallazgos: readonly T[],
  cuantos = 2,
): T[] {
  return [...hallazgos].sort((a, b) => a.rango - b.rango).slice(0, cuantos);
}

/**
 * El ajuste hepático no tiene tabla contra la cual evaluar, y el motor lo dice
 * con este aviso. Mostrar "0" ahí afirmaría que se miró y no había nada.
 */
export function hepaticoSinEvaluar(avisos: readonly { codigo: string }[]): boolean {
  return avisos.some((a) => a.codigo === 'SIN_CHILD_PUGH');
}
