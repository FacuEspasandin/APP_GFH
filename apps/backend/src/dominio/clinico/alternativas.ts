/**
 * Alternativas terapéuticas. Motor §8.
 *
 * El quinto motor: no verifica, propone. Y la parte que importa no es traer la
 * lista del catálogo —eso es un `WHERE`— sino **anotar cada alternativa contra
 * ESTE paciente**: una alternativa genérica no le sirve al médico, lo que
 * necesita saber es qué problemas trae acá.
 *
 * La alternativa pasa por los MISMOS motores que un fármaco prescripto, con el
 * mismo código. Si divergieran, un día el sistema ofrecería como segura una
 * opción que rechazaría al elegirla.
 */

import { parClave, type RangoGravedad } from '@gfh/shared-types';

import {
  evaluarAlergias,
  type AlergiaPaciente,
  type Coincidencia,
  type GrupoAlergenico,
} from './alergias';
import { aplicaEnSemana, type SeveridadAlerta } from './condiciones';
import type {
  CatalogoInteracciones,
  ComponenteActivo,
  SeveridadInteraccion,
} from './interacciones';

/** Una fila de `AlternativaTerapeutica` con lo que hace falta para evaluarla. */
export interface AlternativaCandidata {
  paAlternativaId: string;
  nombre: string;
  razon: string;
  evidencia: string | null;
  /** Grupos alergénicos del principio activo alternativo. */
  gruposAlergenicosIds: readonly string[];
}

export interface AlertaCondicionCatalogo {
  principioActivoId: string;
  condicionId: string;
  condicionNombre: string;
  severidad: SeveridadAlerta;
  semanaMin: number | null;
  semanaMax: number | null;
}

export interface ContextoPaciente {
  /** Medicación activa ya resuelta a componentes (un producto combinado aporta
   *  más de uno). */
  componentes: readonly ComponenteActivo[];
  /**
   * La prescripción que se está reemplazando. Se EXCLUYE de la comparación: no
   * tiene sentido advertir que la alternativa interactúa con el fármaco al que
   * está reemplazando.
   *
   * `null` en el tercer punto de entrada de §8.1 — el médico quiso prescribir
   * algo, se le bloqueó por alergia, y necesita opciones antes de que exista
   * ninguna fila.
   */
  prescripcionReemplazadaId: string | null;
  catalogoInteracciones: CatalogoInteracciones;
  alergias: readonly AlergiaPaciente[];
  gruposAlergenicos: ReadonlyMap<string, GrupoAlergenico>;
  /**
   * Alertas condición-fármaco de TODAS las alternativas, traídas de una sola
   * vez con `principioActivoId IN (...)`. Ver la nota de rendimiento al final.
   */
  alertasPorPrincipioActivo: ReadonlyMap<string, readonly AlertaCondicionCatalogo[]>;
  condicionesActivasIds: ReadonlySet<string>;
  semanaGestacion: number | null;
}

export interface InteraccionPotencial {
  prescripcionId: string;
  paNombre: string;
  severidad: SeveridadInteraccion;
}

export interface AlternativaAnotada {
  paAlternativaId: string;
  nombre: string;
  razon: string;
  evidencia: string | null;
  interaccionesPotenciales: InteraccionPotencial[];
  /** La PEOR coincidencia de alergia, o null. */
  alergia: Coincidencia | null;
  alertasCondicion: Array<{ condicionNombre: string; severidad: SeveridadAlerta }>;
  /** interacciones + alertas + (alergia ? 1 : 0) — el criterio de orden de §8.4 */
  totalProblemas: number;
}

export interface AlternativaDescartada {
  paAlternativaId: string;
  nombre: string;
  motivo: 'ALERGIA_BLOQUEA' | 'CRUCE_FAMILIA_CONTRAINDICADO' | 'CONDICION_CONTRAINDICADA';
}

export interface ResultadoAlternativas {
  /** Ya ordenadas: la más limpia primero. No se filtra por cantidad. */
  viables: AlternativaAnotada[];
  /**
   * Las que no se ofrecen, con el motivo. La UI no las muestra, pero saber por
   * qué se fueron evita el error #7 del motor §12: filtrar de más no produce un
   * error visible, produce menos resultados.
   */
  descartadas: AlternativaDescartada[];
}

/** Puntos para desempatar por gravedad: más severo suma más, así que menor
 *  total = más limpia. */
const PUNTOS_INTERACCION: Record<SeveridadInteraccion, number> = {
  CONTRAINDICADA: 3,
  ALTA: 2,
  INFORMATIVA: 1,
};

export function anotarAlternativas(
  candidatas: readonly AlternativaCandidata[],
  ctx: ContextoPaciente,
): ResultadoAlternativas {
  const viables: AlternativaAnotada[] = [];
  const descartadas: AlternativaDescartada[] = [];

  // El resto de la medicación activa, sin el fármaco que se reemplaza.
  const otros = ctx.componentes.filter(
    (c) => c.prescripcionId !== ctx.prescripcionReemplazadaId,
  );

  for (const cand of candidatas) {
    // --- alergias ---------------------------------------------------------
    const coincidencias = evaluarAlergias(
      { principioActivoId: cand.paAlternativaId, gruposIds: cand.gruposAlergenicosIds },
      ctx.alergias,
      ctx.gruposAlergenicos,
    );
    const peorAlergia = coincidencias.reduce<Coincidencia | null>(
      (peor, c) => (peor === null || c.rango < peor.rango ? c : peor),
      null,
    );

    if (peorAlergia?.bloquea) {
      descartadas.push({ ...idNombre(cand), motivo: 'ALERGIA_BLOQUEA' });
      continue;
    }
    // §8.3 — un cruce de familia que da rango 0 SÍ descarta la alternativa,
    // aunque §7.3 diga que nunca bloquea una prescripción. Son dos acciones
    // distintas sobre el mismo hecho: ofrecerle otra penicilina a quien tiene
    // alergia grave a una no tiene sentido, pero si él la elige, decide él.
    if (peorAlergia !== null && peorAlergia.rango === (0 as RangoGravedad)) {
      descartadas.push({ ...idNombre(cand), motivo: 'CRUCE_FAMILIA_CONTRAINDICADO' });
      continue;
    }

    // --- alertas condición-fármaco ---------------------------------------
    const alertas = (ctx.alertasPorPrincipioActivo.get(cand.paAlternativaId) ?? []).filter(
      (a) =>
        ctx.condicionesActivasIds.has(a.condicionId) &&
        aplicaEnSemana(a.semanaMin, a.semanaMax, ctx.semanaGestacion),
    );

    if (alertas.some((a) => a.severidad === 'CONTRAINDICADO')) {
      descartadas.push({ ...idNombre(cand), motivo: 'CONDICION_CONTRAINDICADA' });
      continue;
    }

    // --- interacciones contra el resto de la medicación -------------------
    const interaccionesPotenciales: InteraccionPotencial[] = [];
    for (const otro of otros) {
      const entrada = ctx.catalogoInteracciones.get(parClave(cand.nombre, otro.nombre));
      if (!entrada) continue;
      interaccionesPotenciales.push({
        prescripcionId: otro.prescripcionId,
        paNombre: otro.nombre,
        severidad: entrada.severidad,
      });
    }

    viables.push({
      paAlternativaId: cand.paAlternativaId,
      nombre: cand.nombre,
      razon: cand.razon,
      evidencia: cand.evidencia,
      interaccionesPotenciales,
      alergia: peorAlergia,
      alertasCondicion: alertas.map((a) => ({
        condicionNombre: a.condicionNombre,
        severidad: a.severidad,
      })),
      totalProblemas:
        interaccionesPotenciales.length + alertas.length + (peorAlergia !== null ? 1 : 0),
    });
  }

  // §8.4 — la más limpia primero:
  //   1. menor cantidad total de problemas
  //   2. a igual cantidad, menor gravedad acumulada de las interacciones
  // No se filtra por cantidad: se muestran todas las viables, ordenadas.
  viables.sort(
    (x, y) =>
      x.totalProblemas - y.totalProblemas ||
      gravedadAcumulada(x) - gravedadAcumulada(y) ||
      x.nombre.localeCompare(y.nombre),
  );

  return { viables, descartadas };
}

function gravedadAcumulada(a: AlternativaAnotada): number {
  return a.interaccionesPotenciales.reduce((n, i) => n + PUNTOS_INTERACCION[i.severidad], 0);
}

function idNombre(c: AlternativaCandidata) {
  return { paAlternativaId: c.paAlternativaId, nombre: c.nombre };
}

/**
 * NOTA DE RENDIMIENTO — motor §8.5, el error que ya se cometió.
 *
 * Anotar alternativas se llegó a resolver consultando par por par dentro de un
 * doble bucle: con 8 alternativas contra 5 fármacos activos son 40 consultas
 * encadenadas.
 *
 * Por eso esta función NO consulta nada. Recibe todo resuelto:
 *   · el catálogo de interacciones ya está en memoria (no es tabla),
 *   · las alertas de condición vienen en UNA query con
 *     `principioActivoId IN (todas las alternativas)`,
 *   · los grupos alergénicos vienen en otra.
 *
 * El adaptador que la llama tiene que mantener eso: si alguna vez alguien mete
 * un `await` adentro del bucle, vuelve el problema.
 */
