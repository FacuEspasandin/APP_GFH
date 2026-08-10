/** Formas que devuelve el backend. Espejo de los DTOs de `apps/backend`. */

export interface FilaPaciente {
  id: string;
  nombre: string;
  apellido: string;
  edadAnios: number;
  clcrMlMin: number | null;
  clcrOrigen: string | null;
  grupoId: string | null;
  grupoNombre: string | null;
  conteoHallazgos: number;
  /** El peor rango que lo toca (0 = grave). `null` cuando no hay hallazgos —
   *  distinto de 3, que es informativo. */
  peorRango: number | null;
}

export interface ResumenGrupo {
  id: string | null;
  nombre: string;
  pacientes: number;
  /** Cada paciente cuenta UNA vez, en el rango más grave que lo toca.
   *  Los nombres siguen la escala del sistema: 0 contraindicado, 1 grave,
   *  2 atención, 3 informativo. */
  contraindicados: number;
  graves: number;
  atencion: number;
  informativos: number;
  sinHallazgos: number;
}

export interface Inicio {
  /** Lista plana, ya ordenada por prioridad desde el backend. */
  pacientes: FilaPaciente[];
  grupos: ResumenGrupo[];
  /** true cuando el resultado viene filtrado por el buscador. */
  buscando: boolean;
}

export interface PacienteCockpit {
  id: string;
  nombre: string;
  apellido: string;
  edadAnios: number;
  sexo: string;
  pesoKg: number | null;
  alturaCm: number | null;
  clcrMlMin: number | null;
  clcrOrigen: string | null;
  gradoKdigo: string | null;
  childPughClase: string | null;
  semanaGestacion: number | null;
  estaLactando: boolean | null;
}

export interface PrescripcionCockpit {
  id: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
  via: string;
  esFarmacoLibre: boolean;
  /** Peor rango que toca al fármaco. `null` = sin hallazgos, no es lo mismo que 3. */
  espina: 0 | 1 | 2 | 3 | null;
  conteoHallazgos: number;
}

export type CategoriaHallazgo = 'INTERACCION' | 'CONDICION' | 'AJUSTE_RENAL' | 'AJUSTE_HEPATICO';

export interface Hallazgo {
  clave: string;
  categoria: CategoriaHallazgo;
  rango: 0 | 1 | 2 | 3;
  titulo: string;
  /** Desambigua el título cuando dos hallazgos lo comparten (productos combinados). */
  subtitulo?: string;
  detalle: string;
  prescripcionIds: string[];
  estadoValidacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  mostradoPeseARechazo: boolean;
}

export interface Cockpit {
  paciente: PacienteCockpit;
  prescripciones: PrescripcionCockpit[];
  dashboard: Record<CategoriaHallazgo, number>;
  hallazgos: Hallazgo[];
  avisos: Array<{ codigo: string; detalle: string; prescripcionId?: string }>;
  condicionesEfectivas: string[];
}
