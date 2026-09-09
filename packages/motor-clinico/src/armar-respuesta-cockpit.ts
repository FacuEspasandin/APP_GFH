/**
 * Arma la forma de respuesta del cockpit a partir de un `ContextoCockpit` ya
 * cargado y el `ResultadoCockpit` de `evaluarCockpit`. Pura — no toca Prisma
 * ni la red — a propósito: es la misma función que usa el backend online y la
 * que corre el móvil sin conexión, para que las dos produzcan exactamente la
 * misma forma de respuesta y la pantalla del paciente no tenga que saber cuál
 * de las dos la generó.
 */

import { ordenarTratamiento } from '@gfh/shared-types';

import type { ContextoCockpit } from './puertos';
import type { ResultadoCockpit } from './evaluar-cockpit';

export interface PacienteResumen {
  id: string;
  nombre: string;
  apellido: string;
  edadAnios: number;
  sexo: string;
  pesoKg: number | null;
  alturaCm: number | null;
  clcrMlMin: number | null;
  clcrOrigen: string | null;
  clcrMedidoAt: string | null;
  creatininaMgDl: number | null;
  gradoKdigo: string | null;
  childPughClase: string | null;
  semanaGestacion: number | null;
  estaLactando: boolean | null;
}

export interface PrescripcionResumen {
  id: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
  via: string;
  esFarmacoLibre: boolean;
  espina: number | null;
  conteoHallazgos: number;
}

export interface RespuestaCockpit extends ResultadoCockpit {
  paciente: PacienteResumen;
  prescripciones: PrescripcionResumen[];
}

export function armarRespuestaCockpit(
  contexto: ContextoCockpit,
  resultado: ResultadoCockpit,
): RespuestaCockpit {
  return {
    ...resultado,
    paciente: {
      id: contexto.paciente.id,
      nombre: contexto.paciente.nombre,
      apellido: contexto.paciente.apellido,
      edadAnios: resultado.edadAnios,
      sexo: contexto.paciente.sexo,
      pesoKg: contexto.paciente.pesoKg,
      alturaCm: contexto.paciente.alturaCm,
      clcrMlMin: resultado.clcrMlMin,
      clcrOrigen: resultado.clcrOrigen,
      clcrMedidoAt: contexto.paciente.clcrMedidoAt?.toISOString() ?? null,
      creatininaMgDl: contexto.paciente.creatininaMgDl,
      gradoKdigo: resultado.gradoKdigo,
      childPughClase: contexto.paciente.childPughClase,
      semanaGestacion: contexto.paciente.semanaGestacion,
      estaLactando: contexto.paciente.estaLactando,
    },
    // El orden sale de acá y no de la pantalla: el paciente de ejemplo arma su
    // lista en otro servicio y tiene que quedar igual. Gravedad primero,
    // cantidad para desempatar — el porqué está en `orden-tratamiento.ts`.
    prescripciones: ordenarTratamiento(
      contexto.prescripciones.map((p) => ({
        id: p.id,
        nombre: p.nombreMostrado,
        dosis: p.dosis,
        frecuencia: p.frecuencia,
        via: p.via,
        esFarmacoLibre: p.esFarmacoLibre,
        espina: resultado.espinaPorPrescripcion.get(p.id) ?? null,
        conteoHallazgos: resultado.hallazgos.filter((h) => h.prescripcionIds.includes(p.id)).length,
      })),
    ),
  };
}
