import type { RangoGravedad } from '@gfh/shared-types';

/**
 * Cómo se ordena y se cuenta lo que arrastra cada alternativa.
 *
 * La lista existe para comparar opciones, así que lo que importa no es el
 * nombre sino qué trae cada una encima. Eso se calcula acá.
 */

export interface AlternativaComparable {
  interaccionesPotenciales: ReadonlyArray<{ paNombre: string; severidad: string }>;
  alertasCondicion: ReadonlyArray<{ condicionNombre: string; severidad: string }>;
  alergia: { rango: RangoGravedad; grupoNombre: string | null } | null;
}

export interface ProblemaDeAlternativa {
  rango: RangoGravedad;
  texto: string;
}

/**
 * Todo lo que una alternativa arrastra, en una sola lista con su gravedad.
 *
 * Las alertas por condición entran como rango 2: la respuesta del backend trae
 * la severidad en texto pero no su rango, y "atención" es lo que corresponde a
 * una alerta que no bloquea.
 */
export function problemasDeAlternativa(
  alt: AlternativaComparable,
): ProblemaDeAlternativa[] {
  return [
    ...alt.interaccionesPotenciales.map((i) => ({
      rango: (i.severidad === 'CONTRAINDICADA'
        ? 0
        : i.severidad === 'ALTA'
          ? 1
          : 3) as RangoGravedad,
      texto: `Interactúa con ${i.paNombre} (${i.severidad.toLowerCase()})`,
    })),
    ...alt.alertasCondicion.map((a) => ({
      rango: 2 as RangoGravedad,
      texto: `Alerta por ${a.condicionNombre} (${a.severidad.toLowerCase()})`,
    })),
    ...(alt.alergia
      ? [
          {
            rango: alt.alergia.rango,
            texto: `Cruce de alergia${alt.alergia.grupoNombre ? ` · ${alt.alergia.grupoNombre}` : ''}`,
          },
        ]
      : []),
  ];
}

/** El peor problema de una alternativa. `null` = no arrastra nada. */
export function peorDeAlternativa(alt: AlternativaComparable): RangoGravedad | null {
  const l = problemasDeAlternativa(alt);
  return l.length === 0 ? null : (Math.min(...l.map((p) => p.rango)) as RangoGravedad);
}

/**
 * Las limpias primero; después, de lo más grave a lo más leve.
 *
 * Los grupos vacíos no se emiten: un encabezado "Contraindicado · 0" es ruido.
 */
export function agruparAlternativas<T extends AlternativaComparable>(
  viables: readonly T[],
): Array<{ rango: RangoGravedad | null; filas: T[] }> {
  const orden: Array<RangoGravedad | null> = [null, 0, 1, 2, 3];

  return orden
    .map((rango) => ({ rango, filas: viables.filter((a) => peorDeAlternativa(a) === rango) }))
    .filter((g) => g.filas.length > 0);
}

/**
 * Cuántas alertas tiene una alternativa, en palabras.
 *
 * Va en cada tarjeta aunque el grupo ya diga la gravedad: dos opciones dentro
 * de "Atención" no son iguales si una arrastra una alerta y la otra tres.
 */
export function conteoDeAlertas(alt: AlternativaComparable): string {
  const n = problemasDeAlternativa(alt).length;
  if (n === 0) return 'Sin alertas';
  return n === 1 ? '1 alerta' : `${n} alertas`;
}

export function resumenAlternativas(total: number, limpias: number): string {
  const opciones = `${total} ${total === 1 ? 'opción' : 'opciones'}`;
  return limpias === 0 ? opciones : `${opciones} · ${limpias} sin alertas`;
}
