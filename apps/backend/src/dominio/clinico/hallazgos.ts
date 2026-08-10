/**
 * Unificación de hallazgos. Motor §9.
 *
 * Las cuatro verificaciones usan escalas distintas; acá se juntan en una sola
 * lista con la escala 0-3, porque el médico piensa por fármaco y no por tipo de
 * verificación.
 *
 * El mapeo a 0-3 y a color NO vive acá: está en `@gfh/shared-types/severidad`,
 * en un único módulo para todo el monorepo.
 */

import {
  claveHallazgo,
  peorRango,
  RANGO_POR_SEVERIDAD_ALERTA,
  RANGO_POR_SEVERIDAD_INTERACCION,
  RANGO_POR_TIPO_AJUSTE,
  type CategoriaHallazgo,
  type EstadoValidacion,
  type RangoGravedad,
  type SeveridadAlerta,
  type SeveridadInteraccion,
  type TipoRangoAjuste,
} from '@gfh/shared-types';

export interface Hallazgo {
  clave: string;
  categoria: CategoriaHallazgo;
  rango: RangoGravedad;
  titulo: string;
  detalle: string;
  /** Prescripciones que toca. Una interacción es UN hallazgo aunque involucre
   *  dos fármacos — por eso es un array y no un id suelto. */
  prescripcionIds: string[];
  estadoValidacion: EstadoValidacion;
  /** true cuando el contenido está observado y se devuelve igual. Solo pasa con
   *  ajuste renal/hepático. */
  mostradoPeseARechazo: boolean;
}

// --- entradas, una por verificación ----------------------------------------

export interface InteraccionParaHallazgo {
  interaccionDetectadaId: string;
  prescripcionAId: string;
  prescripcionBId: string;
  nombreA: string;
  nombreB: string;
  severidad: SeveridadInteraccion;
  texto: string;
  estadoValidacion: EstadoValidacion;
}

export interface AlertaParaHallazgo {
  prescripcionId: string;
  condicionId: string;
  condicionNombre: string;
  farmacoNombre: string;
  origen: 'CONDICION' | 'ALERGIA';
  severidad: SeveridadAlerta;
  texto: string;
  estadoValidacion: EstadoValidacion;
}

export interface AjusteParaHallazgo {
  prescripcionId: string;
  rangoId: string;
  farmacoNombre: string;
  rangoTexto: string;
  textoRecomendacion: string | null;
  tipo: TipoRangoAjuste;
  estadoValidacion: EstadoValidacion;
}

export interface EntradaUnificacion {
  interacciones: readonly InteraccionParaHallazgo[];
  alertas: readonly AlertaParaHallazgo[];
  ajustesRenales: readonly AjusteParaHallazgo[];
  ajustesHepaticos: readonly AjusteParaHallazgo[];
}

export interface ResultadoUnificacion {
  hallazgos: Hallazgo[];
  /** El color de la espina de cada fármaco: el PEOR rango que lo toca.
   *  `null` = sin hallazgos, que NO es lo mismo que rango 3. */
  espinaPorPrescripcion: Map<string, RangoGravedad | null>;
  /** Badges del dashboard: miden CANTIDAD, no gravedad. Son ejes distintos. */
  conteoPorCategoria: Record<CategoriaHallazgo, number>;
}

/**
 * Motor §10.2 — `PENDIENTE` se sigue usando, marcado como borrador: no se
 * oculta riesgo clínico por falta de revisión. Solo `RECHAZADO` apaga.
 *
 * Excepción deliberada: **el ajuste renal/hepático nunca se apaga.** Si un
 * farmacéutico rechaza un ajuste, la recomendación se sigue devolviendo marcada
 * como no validada. Dejar al médico sin ninguna guía de dosis es peor que darle
 * una guía observada.
 */
const CATEGORIAS_QUE_NUNCA_SE_APAGAN: ReadonlySet<CategoriaHallazgo> = new Set([
  'AJUSTE_RENAL',
  'AJUSTE_HEPATICO',
]);

function visible(estado: EstadoValidacion, categoria: CategoriaHallazgo): boolean {
  return estado !== 'RECHAZADO' || CATEGORIAS_QUE_NUNCA_SE_APAGAN.has(categoria);
}

function desdeAjuste(
  a: AjusteParaHallazgo,
  categoria: 'AJUSTE_RENAL' | 'AJUSTE_HEPATICO',
): Hallazgo | null {
  const rango = RANGO_POR_TIPO_AJUSTE[a.tipo];
  // `null` = no genera hallazgo. No es un hallazgo informativo: es que no hay
  // nada que decir (SIN_AJUSTE, VACIO).
  if (rango === null) return null;
  if (!visible(a.estadoValidacion, categoria)) return null;

  const clave =
    categoria === 'AJUSTE_RENAL'
      ? claveHallazgo.renal(a.prescripcionId, a.rangoId)
      : claveHallazgo.hepatico(a.prescripcionId, a.rangoId);

  return {
    clave,
    categoria,
    rango,
    titulo: `${a.farmacoNombre} — ${a.rangoTexto}`,
    detalle: a.textoRecomendacion ?? '',
    prescripcionIds: [a.prescripcionId],
    estadoValidacion: a.estadoValidacion,
    mostradoPeseARechazo: a.estadoValidacion === 'RECHAZADO',
  };
}

export function unificarHallazgos(entrada: EntradaUnificacion): ResultadoUnificacion {
  const hallazgos: Hallazgo[] = [];

  for (const i of entrada.interacciones) {
    if (!visible(i.estadoValidacion, 'INTERACCION')) continue;
    hallazgos.push({
      clave: claveHallazgo.interaccion(i.interaccionDetectadaId),
      categoria: 'INTERACCION',
      rango: RANGO_POR_SEVERIDAD_INTERACCION[i.severidad],
      titulo: `${i.nombreA} + ${i.nombreB}`,
      detalle: i.texto,
      prescripcionIds: [i.prescripcionAId, i.prescripcionBId],
      estadoValidacion: i.estadoValidacion,
      mostradoPeseARechazo: false,
    });
  }

  for (const a of entrada.alertas) {
    if (!visible(a.estadoValidacion, 'CONDICION')) continue;
    hallazgos.push({
      clave: claveHallazgo.alerta(a.prescripcionId, a.condicionId, a.origen),
      categoria: 'CONDICION', // incluye alergias — funcional §6.2
      rango: RANGO_POR_SEVERIDAD_ALERTA[a.severidad],
      titulo: `${a.farmacoNombre} — ${a.condicionNombre}`,
      detalle: a.texto,
      prescripcionIds: [a.prescripcionId],
      estadoValidacion: a.estadoValidacion,
      mostradoPeseARechazo: false,
    });
  }

  for (const a of entrada.ajustesRenales) {
    const h = desdeAjuste(a, 'AJUSTE_RENAL');
    if (h) hallazgos.push(h);
  }
  for (const a of entrada.ajustesHepaticos) {
    const h = desdeAjuste(a, 'AJUSTE_HEPATICO');
    if (h) hallazgos.push(h);
  }

  // Más grave primero; a igual gravedad, orden estable por clave para que la
  // lista no baile entre recálculos.
  hallazgos.sort((x, y) => x.rango - y.rango || x.clave.localeCompare(y.clave));

  return {
    hallazgos,
    espinaPorPrescripcion: calcularEspinas(hallazgos),
    conteoPorCategoria: contarPorCategoria(hallazgos),
  };
}

function calcularEspinas(hallazgos: readonly Hallazgo[]): Map<string, RangoGravedad | null> {
  const porPrescripcion = new Map<string, RangoGravedad[]>();
  for (const h of hallazgos) {
    for (const id of h.prescripcionIds) {
      porPrescripcion.set(id, [...(porPrescripcion.get(id) ?? []), h.rango]);
    }
  }
  return new Map([...porPrescripcion].map(([id, rangos]) => [id, peorRango(rangos)]));
}

function contarPorCategoria(hallazgos: readonly Hallazgo[]): Record<CategoriaHallazgo, number> {
  const conteo: Record<CategoriaHallazgo, number> = {
    INTERACCION: 0,
    CONDICION: 0,
    AJUSTE_RENAL: 0,
    AJUSTE_HEPATICO: 0,
  };
  for (const h of hallazgos) conteo[h.categoria] += 1;
  return conteo;
}

/**
 * Qué hallazgos son NUEVOS respecto del recálculo anterior.
 *
 * Importa para accesibilidad: hay que anunciar solo lo que cambió y reservar la
 * interrupción para los graves, o el lector de pantalla dicta nueve
 * interacciones ya conocidas antes de llegar a la nueva (motor §12.10).
 */
export function hallazgosNuevos(
  actuales: readonly Hallazgo[],
  clavesConocidas: ReadonlySet<string>,
): Hallazgo[] {
  return actuales.filter((h) => !clavesConocidas.has(h.clave));
}
