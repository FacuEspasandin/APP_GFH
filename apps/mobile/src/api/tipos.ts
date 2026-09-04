/**
 * Formas que devuelve el backend. Espejo de los DTOs de `apps/backend`.
 *
 * Todo lo que la API devuelve se declara acá y en ningún otro lado. Las
 * pantallas lo redeclaraban por su cuenta y las copias ya habían divergido: el
 * mismo `GET /auth/yo` estaba escrito con `id` en una y sin `id` en otra, y
 * `GET /perfil/suscripcion` con `productId` en una y sin él en la otra. Ninguna
 * de las dos versiones estaba mal — estaban incompletas, que es peor, porque
 * TypeScript no puede avisar de un campo que nadie declaró.
 */

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
  /** Cuándo se calculó y con qué. La pantalla de función renal pisa el Clcr,
   *  y hacerlo sin ver de dónde salía el anterior es a ciegas. */
  clcrMedidoAt: string | null;
  creatininaMgDl: number | null;
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

/** Mecanismo clínico de una interacción — espejo de `TipoRiesgoInteraccion` en
 *  shared-types. Ausente en CONDICION/AJUSTE_*, que no lo tienen. */
export type TipoRiesgoInteraccion =
  | 'SANGRADO'
  | 'MIOPATIA_RABDOMIOLISIS'
  | 'MIELOSUPRESION'
  | 'SINDROME_SEROTONINERGICO'
  | 'HIPERPOTASEMIA'
  | 'NEFROTOXICIDAD'
  | 'TOXICIDAD_DIGITALICA'
  | 'TOXICIDAD_LITIO'
  | 'HIPOGLUCEMIA'
  | 'EFICACIA_REDUCIDA'
  | 'QT_PROLONGADO'
  | 'ABSORCION_REDUCIDA';

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
  /** Solo en INTERACCION — clave de agrupación del cockpit. */
  tipoRiesgo?: TipoRiesgoInteraccion;
}

export interface Cockpit {
  paciente: PacienteCockpit;
  prescripciones: PrescripcionCockpit[];
  dashboard: Record<CategoriaHallazgo, number>;
  hallazgos: Hallazgo[];
  avisos: Array<{ codigo: string; detalle: string; prescripcionId?: string }>;
  condicionesEfectivas: string[];
  /** El paciente sintético que ve una cuenta sin suscripción. Se mira entero;
   *  no se toca. */
  esDemostracion?: boolean;
}

// --- perfil y sesión ---------------------------------------------------------

export interface Medico {
  id: string;
  email: string;
  nombreUsuario: string;
  nombre: string;
  apellido: string;
  rol: string;
  disclaimerAceptadoAt?: string | null;
  disclaimerVersion?: string | null;
}

export type EstadoSuscripcionValor =
  | 'SIN_SUSCRIPCION'
  | 'ACTIVA'
  | 'GRACIA'
  | 'VENCIDA'
  | 'CANCELADA';

export interface EstadoSuscripcion {
  estado: EstadoSuscripcionValor;
  vigente: boolean;
  productId?: string;
  store?: string;
  periodoActualFin?: string;
}

export interface Sesion {
  id: string;
  dispositivoInfo: string | null;
  creadaAt: string;
  ultimoUsoAt: string | null;
  /**
   * La sesión desde la que se está mirando la lista.
   *
   * Sale del `sid` del access token. Con un token emitido antes de que el
   * payload lo incluyera viene `false` en todas: no se marca ninguna, que es
   * mejor que marcar la equivocada, y se corrige solo al primer refresh.
   */
  esActual: boolean;
}

export type Tema = 'CLARO' | 'OSCURO' | 'SISTEMA';

export interface Configuracion {
  tema: Tema;
  notificacionesPush: boolean;
  umbralAdultoMayor: number;
}

// --- paciente ----------------------------------------------------------------

export interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  documento: string | null;
  fechaNacimiento: string;
  sexo: 'M' | 'F' | 'OTRO';
  alturaCm: number | null;
  grupoId: string | null;
}

/**
 * Los cinco criterios como los guarda el paciente.
 *
 * Los `*Puntos` pueden faltar en un paciente cargado antes de que la pantalla
 * pasara a bandas; los valores exactos llegan como string o número porque
 * Prisma serializa los decimales como texto.
 */
export interface PacienteHepatico {
  bilirrubinaPuntos: number | null;
  albuminaPuntos: number | null;
  inrPuntos: number | null;
  bilirrubinaMgDl: string | number | null;
  albuminaGDl: string | number | null;
  inr: string | number | null;
  ascitis: string | null;
  encefalopatia: string | null;
  childPughClase: string | null;
}

export interface ResultadoChildPugh {
  clase: 'A' | 'B' | 'C' | null;
  puntos: number;
  faltan: string[];
}

export interface CondicionesYAlergias {
  condiciones: Array<{ id: string; codigo: string; nombre: string; observaciones: string | null }>;
  alergias: Array<{
    id: string;
    tipo: string;
    severidad: 'LEVE' | 'MODERADA' | 'GRAVE';
    nombre: string;
    grupo: string | null;
    cruza: boolean;
  }>;
}

// --- catálogo ----------------------------------------------------------------

export interface Condicion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

/**
 * Los campos son los del `select` del backend, no los que alcanzaban para la
 * pantalla que lo usaba.
 *
 * Estaba escrito con `id` y `nombre` nada más, y el compilador lo aceptó porque
 * la pantalla afirmaba su propio tipo. Al centralizarlo saltó: el endpoint
 * devuelve cinco campos.
 */
export interface GrupoAlergenico {
  id: string;
  codigo: string;
  nombre: string;
  nivelCruce: string;
  sinonimos: string[];
}
