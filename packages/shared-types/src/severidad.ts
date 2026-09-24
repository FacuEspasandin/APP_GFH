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
  NivelGravedad,
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
 * Rango 0-5 — de peor a mejor. Es el número interno que ordena/colorea; el
 * dato que se carga y se lee en las tablas es `NivelGravedad` (el nombre).
 * Un solo lugar hace la conversión entre los dos: `RANGO_POR_NIVEL` más abajo.
 *
 *   0 Contraindicada · 1 Grave · 2 Alta · 3 Evitar · 4 Atención · 5 Informativa
 *
 * Reemplaza la escala anterior de 0-3: interacciones, alertas de
 * condición/alergia y ajuste renal/hepático cargan su `NivelGravedad`
 * EXPLÍCITO en el propio registro — no se deriva más de una tabla fija por
 * tipo de verificación, así una interacción, una alerta o un ajuste pueden
 * terminar en cualquiera de los 6 niveles según lo que decidamos al cargar
 * el dato (o, a futuro, lo que traiga Farmanuario).
 */
export type RangoGravedad = 0 | 1 | 2 | 3 | 4 | 5;

export const RANGO_ETIQUETA: Record<RangoGravedad, string> = {
  0: 'Contraindicada',
  1: 'Grave',
  2: 'Alta',
  3: 'Evitar',
  4: 'Atención',
  5: 'Informativa',
};

/** Conversión fija nombre → número. El nombre es lo que vive en los datos
 *  (JSON de reglas, columnas de Prisma); el número es lo que ordena/colorea
 *  en la UI. No hay una segunda tabla por tipo de verificación — ésta es la
 *  única. */
export const RANGO_POR_NIVEL: Record<NivelGravedad, RangoGravedad> = {
  CONTRAINDICADA: 0,
  GRAVE: 1,
  ALTA: 2,
  EVITAR: 3,
  ATENCION: 4,
  INFORMATIVA: 5,
};

/**
 * Mecanismo clínico de una interacción — para agrupar en el cockpit, no para
 * calcular severidad (eso lo sigue haciendo `RANGO_POR_SEVERIDAD_INTERACCION`).
 * Cerrado a propósito: una interacción sin mecanismo claro no entra a la
 * lista a la fuerza, se le suma un valor nuevo cuando aparezca.
 */
export const TIPOS_RIESGO_INTERACCION = [
  'SANGRADO',
  'MIOPATIA_RABDOMIOLISIS',
  'MIELOSUPRESION',
  'SINDROME_SEROTONINERGICO',
  'HIPERPOTASEMIA',
  'NEFROTOXICIDAD',
  'TOXICIDAD_DIGITALICA',
  'TOXICIDAD_LITIO',
  'HIPOGLUCEMIA',
  'EFICACIA_REDUCIDA',
  'QT_PROLONGADO',
  'ABSORCION_REDUCIDA',
] as const;
export type TipoRiesgoInteraccion = (typeof TIPOS_RIESGO_INTERACCION)[number];

export const TIPO_RIESGO_ETIQUETA: Record<TipoRiesgoInteraccion, string> = {
  SANGRADO: 'Riesgo de sangrado',
  MIOPATIA_RABDOMIOLISIS: 'Miopatía / rabdomiólisis',
  MIELOSUPRESION: 'Mielosupresión',
  SINDROME_SEROTONINERGICO: 'Síndrome serotoninérgico',
  HIPERPOTASEMIA: 'Hiperpotasemia',
  NEFROTOXICIDAD: 'Nefrotoxicidad',
  TOXICIDAD_DIGITALICA: 'Toxicidad digitálica',
  TOXICIDAD_LITIO: 'Toxicidad por litio',
  HIPOGLUCEMIA: 'Hipoglucemia',
  EFICACIA_REDUCIDA: 'Eficacia reducida',
  QT_PROLONGADO: 'QT prolongado',
  ABSORCION_REDUCIDA: 'Absorción reducida',
};

export function esGrave(rango: RangoGravedad): boolean {
  return rango <= 1;
}

/** El peor de una lista. `null` = sin hallazgos (que NO es lo mismo que rango 5). */
export function peorRango(rangos: readonly RangoGravedad[]): RangoGravedad | null {
  if (rangos.length === 0) return null;
  return rangos.reduce<RangoGravedad>((peor, r) => (r < peor ? r : peor), 5);
}

// ---------------------------------------------------------------------------
// 2. Mapeo desde cada escala del dominio
//
// DEPRECADO — reemplazado por `NivelGravedad` cargado explícito en cada
// registro (interacción, alerta, ajuste). Estas tres tablas quedan sólo
// mientras `@gfh/motor-clinico` termina de migrarse; no agregar nuevos usos.
// ---------------------------------------------------------------------------

/** @deprecated usar `NivelGravedad` explícito en el dato, ver `RANGO_POR_NIVEL`. */
export const RANGO_POR_SEVERIDAD_INTERACCION: Record<SeveridadInteraccion, RangoGravedad> = {
  CONTRAINDICADA: 0,
  ALTA: 2,
  INFORMATIVA: 5,
};

/** @deprecated usar `NivelGravedad` explícito en el dato, ver `RANGO_POR_NIVEL`. */
export const RANGO_POR_SEVERIDAD_ALERTA: Record<SeveridadAlerta, RangoGravedad> = {
  CONTRAINDICADO: 0,
  EVITAR: 3,
  PRECAUCION: 4,
  INFO: 5,
};

/** @deprecated usar `NivelGravedad` explícito en el dato, ver `RANGO_POR_NIVEL`.
 *  `null` = no genera hallazgo (SIN_AJUSTE, VACIO). */
export const RANGO_POR_TIPO_AJUSTE: Record<TipoRangoAjuste, RangoGravedad | null> = {
  CONTRAINDICADO: 0,
  EVITAR: 3,
  PRECAUCION: 4,
  CONDICIONAL: 4,
  REDUCIR_DOSIS: 4,
  AUMENTAR_INTERVALO: 4,
  REDUCIR_DOSIS_Y_INTERVALO: 4,
  NOTA_AL_PIE: 5,
  SIN_AJUSTE: null,
  VACIO: null,
};

/**
 * Base por severidad de la alergia, atenuada según cuán lejos está la
 * coincidencia — motor §7.3 combina "severidad × nivel_cruce" sin dar la
 * matriz exacta, esto sigue siendo la interpretación propia de siempre,
 * reparametrizada sobre los 6 niveles en vez de 4. `GRAVE` (alergia) mapea
 * directo a "Grave" (nivel 1) por nombre — MODERADA y LEVE no tienen
 * contraparte de nombre directo, así que se ubican por criterio clínico:
 * MODERADA en "Evitar" (hay que evitar la combinación), LEVE en "Atención"
 * (alcanza con vigilar). El `nivelCruce` que entra es el del grupo para
 * CRUCE_FAMILIA y el del grupo PADRE para CRUCE_FAMILIA_AMPLIA (motor §7.2).
 */
const BASE_POR_SEVERIDAD_ALERGIA: Record<SeveridadAlergia, RangoGravedad> = {
  GRAVE: 1,
  MODERADA: 3,
  LEVE: 4,
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

  return Math.min(5, base + atenuacion) as RangoGravedad;
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

/**
 * Un color POR NIVEL, no un balde de 4 — con 6 niveles, agrupar en
 * "grave/media/ok/neutro" perdía la distinción que todo este cambio pedía
 * (Alta y Evitar, por ejemplo, quedaban indistinguibles). Gradiente rojo →
 * gris, ninguno amarillo puro, todos legibles con texto blanco encima.
 */
export const COLOR_POR_RANGO: Record<RangoGravedad, string> = {
  0: '#991B1B',
  1: '#DC2626',
  2: '#EA580C',
  3: '#D97706',
  4: '#CD9404',
  5: '#78716C',
};

/** El color de la espina de un farmaco es el PEOR rango que lo toca. Barra de
 *  3-4px en el borde izquierdo: es la firma visual del sistema y no se aplica a
 *  nada que no sea gravedad clinica real. `null` = sin hallazgos → verde de
 *  "ok" (reusa `COLOR_SEVERIDAD`, no es un 7mo nivel de gravedad). */
export function colorEspina(rango: RangoGravedad | null): string {
  return rango === null ? COLOR_SEVERIDAD.ok : COLOR_POR_RANGO[rango];
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

/**
 * Lee de vuelta la clave de una alerta.
 *
 * La app necesita saber cuántos fármacos toca cada condición cargada, y el
 * cockpit ya trae los hallazgos: la cuenta sale de agrupar por `condicionId`
 * sin pedir nada más al servidor. Parsear el string desde la UI ataría el
 * formato a dos lugares, así que la vuelta vive al lado de la ida.
 *
 * `null` si la clave no es de una alerta —una interacción o un ajuste— o si
 * viene malformada.
 */
export function partesClaveAlerta(
  clave: string,
): { prescripcionId: string; condicionId: string; origen: 'CONDICION' | 'ALERGIA' } | null {
  const partes = clave.split(':');
  if (partes.length !== 4 || partes[0] !== 'al') return null;

  const [, prescripcionId, condicionId, origen] = partes as [string, string, string, string];
  if (origen !== 'CONDICION' && origen !== 'ALERGIA') return null;

  return { prescripcionId, condicionId, origen };
}

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
