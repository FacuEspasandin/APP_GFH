/**
 * El orquestador: corre las cinco verificaciones sobre un `ContextoCockpit` y
 * devuelve los hallazgos unificados.
 *
 * Sigue siendo dominio puro — recibe el contexto ya cargado y no consulta nada.
 * Todo lo que hay acá es determinista: misma entrada, misma salida, siempre.
 */

import type { CatalogoInteracciones } from './interacciones';
import { detectarInteracciones } from './interacciones';
import { elegirRango, farmacoLibreRequiereAlerta } from './ajuste-renal';
import { evaluarAlergias } from './alergias';
import {
  aplicaEnSemana,
  condicionesEfectivas,
  hayAlertasSinAfinarPorSemana,
  CODIGO_EMBARAZO,
} from './condiciones';
import { calcularClcr, edadEnAnios } from '@gfh/shared-types';
import {
  unificarHallazgos,
  type AjusteParaHallazgo,
  type AlertaParaHallazgo,
  type InteraccionParaHallazgo,
  type ResultadoUnificacion,
} from './hallazgos';
import type { ContextoCockpit, PrescripcionActiva } from './puertos';
import { gradoKdigo, type GradoKdigo } from '@gfh/shared-types';

export interface AvisoFaltaDeDato {
  codigo: 'SIN_CLCR' | 'SIN_SEMANA_GESTACION' | 'SIN_CHILD_PUGH' | 'FARMACO_LIBRE_CLCR_BAJO';
  detalle: string;
  prescripcionId?: string;
}

export interface ResultadoCockpit extends ResultadoUnificacion {
  clcrMlMin: number | null;
  clcrOrigen: string | null;
  gradoKdigo: GradoKdigo | null;
  edadAnios: number;
  condicionesEfectivasCodigos: string[];
  /**
   * Lo que el sistema NO pudo evaluar por falta de dato. Se muestra en neutro:
   * ni tranquiliza ni alarma. Nunca se infiere "sin problema".
   */
  avisos: AvisoFaltaDeDato[];
  /** Interacciones a persistir. El caso de uso decide si escribe. */
  interaccionesDetectadas: ReturnType<typeof detectarInteracciones>;
}

export function evaluarCockpit(
  ctx: ContextoCockpit,
  catalogoInteracciones: CatalogoInteracciones,
  hoy: Date,
): ResultadoCockpit {
  const avisos: AvisoFaltaDeDato[] = [];
  const p = ctx.paciente;
  const edad = edadEnAnios(p.fechaNacimiento, hoy);

  // --- función renal --------------------------------------------------------
  // El médico siempre puede pisar el valor calculado; por eso existe
  // `clcrOrigen`. Si hay uno manual, gana ese.
  let clcr = p.clcrMlMin;
  let clcrOrigen = p.clcrOrigen;
  if (clcr === null && p.pesoKg !== null && p.creatininaMgDl !== null) {
    try {
      clcr = calcularClcr({
        edadAnios: edad,
        pesoKg: p.pesoKg,
        creatininaMgDl: p.creatininaMgDl,
        sexo: p.sexo,
      });
      clcrOrigen = 'CALCULADO_COCKCROFT';
    } catch {
      // Dato fuera de rango: se deja sin Clcr y se avisa. No se calcula igual.
      clcr = null;
    }
  }
  if (clcr === null) {
    avisos.push({
      codigo: 'SIN_CLCR',
      detalle: 'Sin función renal: no se puede evaluar el ajuste de dosis.',
    });
  }

  // --- condiciones efectivas (incluye las sintéticas) -----------------------
  const codigosEfectivos = condicionesEfectivas(ctx.condicionesCargadasCodigos, {
    edadAnios: edad,
    semanaGestacion: p.semanaGestacion,
    embarazada: ctx.condicionesCargadasCodigos.includes(CODIGO_EMBARAZO),
    estaLactando: p.estaLactando,
    umbralAdultoMayor: ctx.umbralAdultoMayor,
  });
  const condicionesActivasIds = new Set(ctx.condicionesCargadasIds);
  for (const a of ctx.alertas) {
    if (codigosEfectivos.includes(a.condicionCodigo)) condicionesActivasIds.add(a.condicionId);
  }

  // --- 1. interacciones -----------------------------------------------------
  const componentes = ctx.prescripciones.flatMap((pr) => pr.componentes);
  const interaccionesDetectadas = detectarInteracciones(
    componentes,
    catalogoInteracciones,
    ctx.curaciones,
  );
  const nombrePorPrescripcion = new Map(ctx.prescripciones.map((pr) => [pr.id, pr.nombreMostrado]));

  const interacciones: InteraccionParaHallazgo[] = interaccionesDetectadas.map((i) => ({
    // Sin fila persistida todavía, la clave estable se arma con el par —
    // determinista y suficiente para detectar novedades entre recálculos.
    interaccionDetectadaId: `${i.prescripcionAId}:${i.prescripcionBId}:${i.parClave}`,
    prescripcionAId: i.prescripcionAId,
    prescripcionBId: i.prescripcionBId,
    nombreA: nombrePorPrescripcion.get(i.prescripcionAId) ?? '',
    nombreB: nombrePorPrescripcion.get(i.prescripcionBId) ?? '',
    parClave: i.parClave,
    severidad: i.severidad,
    texto: i.texto,
    estadoValidacion: 'PENDIENTE',
  }));

  // --- 2. ajuste renal ------------------------------------------------------
  const ajustesRenales: AjusteParaHallazgo[] = [];
  if (clcr !== null) {
    for (const pr of ctx.prescripciones) {
      if (pr.esFarmacoLibre) {
        // Motor §4.5 — no tiene tabla. Con Clcr < 60 se avisa por texto; NO se
        // sugiere ninguna dosis.
        if (farmacoLibreRequiereAlerta(clcr)) {
          avisos.push({
            codigo: 'FARMACO_LIBRE_CLCR_BAJO',
            detalle: `${pr.nombreMostrado}: hay deterioro de la función renal, verificá el ajuste manualmente.`,
            prescripcionId: pr.id,
          });
        }
        continue;
      }

      for (const comp of pr.componentes) {
        const ajuste = elegirAjustePorVia(ctx.ajustesRenales.get(comp.principioActivoId), pr.via);
        if (!ajuste) continue; // sin tabla = sin datos, no es un error

        const elegido = elegirRango(ajuste.rangos, clcr);
        if (!elegido) continue;

        ajustesRenales.push({
          prescripcionId: pr.id,
          rangoId: elegido.rango.id,
          farmacoNombre: comp.nombre,
          rangoTexto: elegido.rango.rangoTexto,
          textoRecomendacion: elegido.rango.textoRecomendacion,
          tipo: elegido.rango.tipo as AjusteParaHallazgo['tipo'],
          estadoValidacion: ajuste.estadoValidacion,
        });
      }
    }
  }

  // --- 3 y 4. condiciones y alergias ---------------------------------------
  const alertas: AlertaParaHallazgo[] = [];
  const paDePrescripcion = new Map<string, PrescripcionActiva[]>();
  for (const pr of ctx.prescripciones) {
    for (const c of pr.componentes) {
      paDePrescripcion.set(c.principioActivoId, [
        ...(paDePrescripcion.get(c.principioActivoId) ?? []),
        pr,
      ]);
    }
  }

  for (const alerta of ctx.alertas) {
    if (!condicionesActivasIds.has(alerta.condicionId)) continue;
    if (!aplicaEnSemana(alerta.semanaMin, alerta.semanaMax, p.semanaGestacion)) continue;

    // Una misma fila produce una alerta por CADA prescripción que use ese PA:
    // un mismo principio activo puede estar prescripto más de una vez.
    for (const pr of paDePrescripcion.get(alerta.principioActivoId) ?? []) {
      alertas.push({
        prescripcionId: pr.id,
        condicionId: alerta.condicionId,
        condicionNombre: alerta.condicionNombre,
        farmacoNombre: pr.nombreMostrado,
        origen: 'CONDICION',
        severidad: alerta.severidad,
        texto: alerta.texto,
        estadoValidacion: alerta.estadoValidacion,
      });
    }
  }

  for (const pr of ctx.prescripciones) {
    for (const comp of pr.componentes) {
      const coincidencias = evaluarAlergias(
        { principioActivoId: comp.principioActivoId, gruposIds: comp.gruposAlergenicosIds },
        ctx.alergias,
        ctx.gruposAlergenicos,
      );
      for (const c of coincidencias) {
        alertas.push({
          prescripcionId: pr.id,
          condicionId: c.alergiaId,
          condicionNombre: c.grupoNombre ?? 'Alergia',
          farmacoNombre: comp.nombre,
          origen: 'ALERGIA',
          severidad: severidadDesdeRango(c.rango),
          texto: textoAlergia(c.tipo, c.grupoNombre),
          estadoValidacion: 'PENDIENTE',
        });
      }
    }
  }

  // --- avisos por falta de dato --------------------------------------------
  if (hayAlertasSinAfinarPorSemana(ctx.alertas, p.semanaGestacion) && codigosEfectivos.includes(CODIGO_EMBARAZO)) {
    avisos.push({
      codigo: 'SIN_SEMANA_GESTACION',
      detalle:
        'Hay alertas que dependen de la semana de gestación y no está registrada. Se mantienen todas.',
    });
  }
  if (p.childPughClase === null) {
    avisos.push({
      codigo: 'SIN_CHILD_PUGH',
      detalle: 'Sin estado hepático: el ajuste hepático no se puede evaluar.',
    });
  }

  const unificado = unificarHallazgos({
    interacciones,
    alertas,
    ajustesRenales,
    ajustesHepaticos: [], // sin fuente de datos todavía — modelo §7.1
  });

  return {
    ...unificado,
    clcrMlMin: clcr,
    clcrOrigen,
    gradoKdigo: gradoKdigo(clcr),
    edadAnios: edad,
    condicionesEfectivasCodigos: codigosEfectivos,
    avisos,
    interaccionesDetectadas,
  };
}

/**
 * El ajuste renal está indexado por (principio activo, vía). Se busca la fila
 * de la vía de la prescripción; si no hay, se cae a `NO_ESPECIFICADA`, que es
 * la que tienen 590 de las 635 filas del catálogo.
 *
 * Si no hay ninguna de las dos, es "sin datos" — neutro, no "sin problema".
 */
function elegirAjustePorVia<T extends { viaAdministracion: string }>(
  ajustes: T[] | undefined,
  via: string,
): T | undefined {
  if (!ajustes || ajustes.length === 0) return undefined;
  return (
    ajustes.find((a) => a.viaAdministracion === via) ??
    ajustes.find((a) => a.viaAdministracion === 'NO_ESPECIFICADA')
  );
}

function severidadDesdeRango(rango: number): AlertaParaHallazgo['severidad'] {
  if (rango === 0) return 'CONTRAINDICADO';
  if (rango === 1) return 'EVITAR';
  if (rango === 2) return 'PRECAUCION';
  return 'INFO';
}

function textoAlergia(tipo: string, grupoNombre: string | null): string {
  if (tipo === 'EXACTA') return 'El paciente tiene alergia registrada a este principio activo.';
  const grupo = grupoNombre ? ` (${grupoNombre})` : '';
  return tipo === 'CRUCE_FAMILIA'
    ? `Cruce con una alergia de la misma familia${grupo}. Requiere confirmación explícita.`
    : `Cruce con una familia emparentada${grupo}. Requiere confirmación explícita.`;
}
