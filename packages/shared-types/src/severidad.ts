/**
 * ============================================================================
 * EL modulo de severidad. Uno solo, en todo el monorepo.
 * ============================================================================
 *
 * En GFH web esto estuvo definido TRES veces con hex ligeramente distintos —el
 * mapa de camas, el dashboard y las fichas de curacion— y es exactamente asi
 * como un lenguaje visual deja de significar algo (12-sistema-visual.md §3.2).
 * Si en la app movil el rojo se define en dos archivos, en seis meses son dos
 * rojos.
 *
 * Nada de lo de aca se re-declara en `apps/backend` ni en `apps/mobile`.
 *
 * Fuentes: 11-motor-clinico §9 (escala unificada 0-3, claves estables),
 *          12-sistema-visual §3 (mapeo a color, escala de conteo),
 *          design-tokens-cockpit-movil §1.
 */

import type {
  CategoriaHallazgo,
  NivelCruce,
  SeveridadAlergia,
  SeveridadAlerta,
  SeveridadInteraccion,
  TipoCoincidenciaAlergia,
  TipoRangoAjuste,
} from './enums';

// ---------------------------------------------------------------------------
// 1. La escala unificada
// ---------------------------------------------------------------------------

/**
 * Rango 0-3. Las verificaciones usan escalas distintas; para la UI se unifican
 * porque el medico piensa por farmaco y no por tipo de verificacion.
 *
 *   0 contraindicado · 1 grave/evitar · 2 atencion · 3 informativo
 *
 * Rango <= 1 es "grave": exige accion. 2 y 3 son contexto.
 */
export type RangoGravedad = 0 | 1 | 2 | 3;

export const RANGO_ETIQUETA: Record<RangoGravedad, string> = {
  0: 'Contraindicado',
  1: 'Grave',
  2: 'Atención',
  3: 'Informativo',
};

export function esGrave(rango: RangoGravedad): boolean {
  return rango <= 1;
}

/** El peor de una lista. `null` = sin hallazgos (que NO es lo mismo que rango 3). */
export function peorRango(rangos: readonly RangoGravedad[]): RangoGravedad | null {
  if (rangos.length === 0) return null;
  return rangos.reduce<RangoGravedad>((peor, r) => (r < peor ? r : peor), 3);
}

// ---------------------------------------------------------------------------
// 2. Mapeo desde cada escala del dominio
// ---------------------------------------------------------------------------

/** motor §9 — tabla textual del documento. */
export const RANGO_POR_SEVERIDAD_INTERACCION: Record<SeveridadInteraccion, RangoGravedad> = {
  CONTRAINDICADA: 0,
  ALTA: 1,
  INFORMATIVA: 3,
};

/** motor §9 — tabla textual del documento. */
export const RANGO_POR_SEVERIDAD_ALERTA: Record<SeveridadAlerta, RangoGravedad> = {
  CONTRAINDICADO: 0,
  EVITAR: 1,
  PRECAUCION: 2,
  INFO: 3,
};

/**
 * PROPUESTO — no esta en ningun documento.
 *
 * motor §9 mapea a 0-3 solo las interacciones y las alertas condicion/alergia,
 * pero la clave estable `ren:<prescripcion_id>:<rango_id>` prueba que el ajuste
 * renal SI produce hallazgos, y el cockpit tiene una categoria propia para el
 * hepatico. Sin este mapeo la espina de un farmaco con ajuste renal no tiene
 * color.
 *
 * Ojo, no confundir con la BANDA KDIGO de mas abajo: eso colorea la funcion
 * renal DEL PACIENTE; esto colorea la gravedad del hallazgo de ESE farmaco.
 *
 * `null` = no genera hallazgo (no es un hallazgo informativo: es que no hay
 * nada que decir).
 */
export const RANGO_POR_TIPO_AJUSTE: Record<TipoRangoAjuste, RangoGravedad | null> = {
  CONTRAINDICADO: 0,
  EVITAR: 1,
  PRECAUCION: 2,
  CONDICIONAL: 2,
  REDUCIR_DOSIS: 2,
  AUMENTAR_INTERVALO: 2,
  REDUCIR_DOSIS_Y_INTERVALO: 2,
  NOTA_AL_PIE: 3,
  SIN_AJUSTE: null,
  VACIO: null,
};

/**
 * PROPUESTO — motor §7.3 dice "combina severidad × nivel_cruce" pero no da la
 * matriz.
 *
 * Base por severidad de la alergia, atenuada segun cuan lejos esta la
 * coincidencia. El `nivelCruce` que entra es el del grupo para CRUCE_FAMILIA y
 * el del grupo PADRE para CRUCE_FAMILIA_AMPLIA (motor §7.2).
 */
const BASE_POR_SEVERIDAD_ALERGIA: Record<SeveridadAlergia, RangoGravedad> = {
  GRAVE: 0,
  MODERADA: 1,
  LEVE: 2,
};

const ATENUACION_POR_NIVEL_CRUCE: Record<NivelCruce, number> = {
  ALTO: 0,
  MODERADO: 1,
  BAJO: 2,
};

export function rangoPorAlergia(
  severidad: SeveridadAlergia,
  coincidencia: TipoCoincidenciaAlergia,
  nivelCruce?: NivelCruce,
): RangoGravedad {
  const base = BASE_POR_SEVERIDAD_ALERGIA[severidad];
  if (coincidencia === 'EXACTA') return base;

  const atenuacion =
    ATENUACION_POR_NIVEL_CRUCE[nivelCruce ?? 'MODERADO'] +
    (coincidencia === 'CRUCE_FAMILIA_AMPLIA' ? 1 : 0);

  return Math.min(3, base + atenuacion) as RangoGravedad;
}

/**
 * Bloquear la prescripcion y pintar rojo son DOS COSAS DISTINTAS, y el motor
 * las trata distinto en dos secciones que hay que leer juntas:
 *
 *   §7.3 — solo la coincidencia EXACTA con severidad GRAVE impide prescribir.
 *          El cruce de familia NUNCA bloquea: alerta fuerte + confirmacion
 *          explicita. El cruce real penicilina→cefalosporina es del 1-3%;
 *          bloquearlo empuja al medico hacia antibioticos peores.
 *
 *   §8.3 — pero un cruce de familia que da rango 0 SI descarta una ALTERNATIVA
 *          de la lista de sugerencias (no tiene sentido ofrecerle otra
 *          penicilina a quien tiene alergia grave a una).
 *
 * O sea: `rangoPorAlergia` puede devolver 0 sin que `bloqueaPrescripcion` sea
 * true. No colapsar las dos en una sola funcion.
 */
export function bloqueaPrescripcion(
  severidad: SeveridadAlergia,
  coincidencia: TipoCoincidenciaAlergia,
): boolean {
  return coincidencia === 'EXACTA' && severidad === 'GRAVE';
}

/** Motor §7.3: todo lo que alerta pero no bloquea exige confirmacion explicita
 *  del medico (el 409 de §7.5). */
export function requiereConfirmacion(
  severidad: SeveridadAlergia,
  coincidencia: TipoCoincidenciaAlergia,
): boolean {
  return !bloqueaPrescripcion(severidad, coincidencia);
}

// ---------------------------------------------------------------------------
// 3. Color — la escala de severidad clinica
// ---------------------------------------------------------------------------

/**
 * Cuatro colores, hex literales, IGUALES en tema claro y oscuro: el significado
 * no cambia con la preferencia del usuario. Si el rojo se aclarara en oscuro
 * "para que combine", dejaria de ser el mismo rojo que el medico aprendio a
 * temer (12-sistema-visual §1).
 *
 * RESERVADOS para gravedad clinica. El verde de marca (`primary`, #1F5E4A) NO
 * es intercambiable con `ok` aunque se parezcan.
 */
export const COLOR_SEVERIDAD = {
  grave: '#EF4444',
  media: '#F59E0B',
  ok: '#22C55E',
  /** Sin dato. Ni tranquiliza ni alarma — decirlo es parte de la informacion. */
  neutro: '#8CA39A',
} as const;

export type ClaveColorSeveridad = keyof typeof COLOR_SEVERIDAD;

/** `null` = sin hallazgos → verde. Distinto de rango 3 (informativo) → gris. */
export function claveColorPorRango(rango: RangoGravedad | null): ClaveColorSeveridad {
  if (rango === null) return 'ok';
  if (rango <= 1) return 'grave';
  if (rango === 2) return 'media';
  return 'neutro';
}

/** El color de la espina de un farmaco es el PEOR rango que lo toca. Barra de
 *  3-4px en el borde izquierdo: es la firma visual del sistema y no se aplica a
 *  nada que no sea gravedad clinica real. */
export function colorEspina(rango: RangoGravedad | null): string {
  return COLOR_SEVERIDAD[claveColorPorRango(rango)];
}

// ---------------------------------------------------------------------------
// 4. Color — la escala de CONTEO (eje distinto, no mezclar)
// ---------------------------------------------------------------------------

/**
 * Mide CUANTOS hallazgos hay, no cuan graves son. Cuatro pasos con amarillo
 * intermedio; la escala clinica tiene tres colores mas el neutro. Son lenguajes
 * distintos porque miden cosas distintas.
 *
 * Se usa en: badges del dashboard de 4 categorias, filas de tratamiento, filas
 * de paciente en Inicio, y el cuadrito de las alternativas terapeuticas.
 *
 * El NUMERO siempre esta, ademas del color: "naranja" no dice si son dos o
 * siete, y un usuario con daltonismo perderia el dato y no solo el atajo.
 */
export const COLOR_CONTEO = {
  n0: { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
  n1: { bg: '#FEF9C3', text: '#713F12', border: '#FDE047' },
  n2: { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' },
  n3: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
} as const;

export type ClaveColorConteo = keyof typeof COLOR_CONTEO;

export function claveColorPorConteo(n: number): ClaveColorConteo {
  if (n <= 0) return 'n0';
  if (n === 1) return 'n1';
  if (n === 2) return 'n2';
  return 'n3';
}

// ---------------------------------------------------------------------------
// 5. Banda de funcion renal — del PACIENTE, no de un hallazgo
// ---------------------------------------------------------------------------

/** Mismo criterio en toda la app (12-sistema-visual §3.1). Sin dato ⇒ neutro,
 *  nunca verde: no sabemos. */
export function claveColorPorClcr(clcrMlMin: number | null): ClaveColorSeveridad {
  if (clcrMlMin === null) return 'neutro';
  if (clcrMlMin < 30) return 'grave';
  if (clcrMlMin < 60) return 'media';
  return 'ok';
}

/** KDIGO — informativo. No decide nada del motor (motor §4.2). */
export type GradoKdigo = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';

export const KDIGO_DESCRIPCION: Record<GradoKdigo, string> = {
  G1: 'Normal o aumentada',
  G2: 'Descenso leve',
  G3a: 'Descenso leve-moderado',
  G3b: 'Descenso moderado-severo',
  G4: 'Descenso severo',
  G5: 'Fallo renal',
};

export function gradoKdigo(clcrMlMin: number | null): GradoKdigo | null {
  if (clcrMlMin === null) return null;
  if (clcrMlMin >= 90) return 'G1';
  if (clcrMlMin >= 60) return 'G2';
  if (clcrMlMin >= 45) return 'G3a';
  if (clcrMlMin >= 30) return 'G3b';
  if (clcrMlMin >= 15) return 'G4';
  return 'G5';
}

// ---------------------------------------------------------------------------
// 6. Claves estables de hallazgo
// ---------------------------------------------------------------------------

/**
 * Estables entre recalculos, para poder detectar cuales son NUEVOS (motor §9).
 * Importan tambien para accesibilidad: hay que anunciar solo lo que cambio y
 * reservar la interrupcion para los hallazgos graves, o el lector de pantalla
 * dicta nueve interacciones ya conocidas antes de llegar a la nueva
 * (motor §12.10).
 */
export const claveHallazgo = {
  interaccion: (interaccionDetectadaId: string) => `int:${interaccionDetectadaId}`,
  alerta: (prescripcionId: string, condicionId: string, origen: 'CONDICION' | 'ALERGIA') =>
    `al:${prescripcionId}:${condicionId}:${origen}`,
  renal: (prescripcionId: string, rangoId: string) => `ren:${prescripcionId}:${rangoId}`,
  /** PROPUESTO — el hepatico no existia cuando se escribio motor §9. */
  hepatico: (prescripcionId: string, rangoId: string) => `hep:${prescripcionId}:${rangoId}`,
} as const;

// ---------------------------------------------------------------------------
// 7. Forma del hallazgo unificado
// ---------------------------------------------------------------------------

export interface Hallazgo {
  clave: string;
  categoria: CategoriaHallazgo;
  rango: RangoGravedad;
  titulo: string;
  detalle: string;
  /** Prescripciones que toca. Una interaccion es UN hallazgo aunque involucre
   *  dos farmacos. */
  prescripcionIds: string[];
  /** Se muestra el contenido igual si es PENDIENTE — no se oculta riesgo
   *  clinico por falta de revision, se marca como borrador (motor §10.2). */
  estadoValidacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  /** true cuando el contenido esta observado pero se devuelve igual. El ajuste
   *  renal/hepatico NUNCA se apaga, aun RECHAZADO. */
  mostradoPeseARechazo?: boolean;
}
