/**
 * Los filtros del historial, compartidos entre la app y el backend.
 *
 * Viven acá porque el agrupado tiene que ser el mismo de los dos lados: si la
 * app dijera que `DATOS_RENALES` es «datos clínicos» y el backend lo pusiera en
 * «paciente», el chip mostraría una lista que no coincide con su propio
 * conteo, y nadie se daría cuenta hasta que un médico lo mire.
 *
 * **Los filtros se aplican en el servidor**, no sobre lo que la app ya bajó. El
 * historial se pagina de a 50, así que filtrar en el teléfono contestaría «no
 * hay nada» cuando lo que hay está en una página que todavía no se pidió — que
 * es peor que no tener filtro.
 */

export const TIPOS_DE_EVENTO = [
  'PACIENTE_CREADO',
  'PACIENTE_EDITADO',
  'FARMACO_AGREGADO',
  'FARMACO_EDITADO',
  'FARMACO_SUSPENDIDO',
  'FARMACO_REACTIVADO',
  'FARMACO_QUITADO',
  'CONDICION_AGREGADA',
  'CONDICION_QUITADA',
  'ALERGIA_AGREGADA',
  'ALERGIA_QUITADA',
  'DATOS_RENALES',
  'DATOS_HEPATICOS',
  'EMBARAZO_LACTANCIA',
  'ALTERNATIVA_ACEPTADA',
] as const;

export type TipoDeEvento = (typeof TIPOS_DE_EVENTO)[number];

/**
 * Cuatro grupos y no quince tipos.
 *
 * Los tipos internos son quince y ofrecerlos como filtro convierte el filtro en
 * otro problema. Cuatro son los cuatro bloques del cockpit, que es como un
 * médico piensa cuando busca: «qué le cambié de la medicación», «qué análisis
 * cargué», «qué condiciones tiene», «qué toqué del paciente».
 */
export const GRUPOS_DE_EVENTO = {
  tratamiento: [
    'FARMACO_AGREGADO',
    'FARMACO_EDITADO',
    'FARMACO_SUSPENDIDO',
    'FARMACO_REACTIVADO',
    'FARMACO_QUITADO',
    'ALTERNATIVA_ACEPTADA',
  ],
  analisis: ['DATOS_RENALES', 'DATOS_HEPATICOS', 'EMBARAZO_LACTANCIA'],
  condiciones: [
    'CONDICION_AGREGADA',
    'CONDICION_QUITADA',
    'ALERGIA_AGREGADA',
    'ALERGIA_QUITADA',
  ],
  paciente: ['PACIENTE_CREADO', 'PACIENTE_EDITADO'],
} as const satisfies Record<string, readonly TipoDeEvento[]>;

export type GrupoDeEvento = keyof typeof GRUPOS_DE_EVENTO;

export const NOMBRE_GRUPO: Record<GrupoDeEvento, string> = {
  tratamiento: 'Tratamiento',
  analisis: 'Análisis',
  condiciones: 'Condiciones',
  paciente: 'Paciente',
};

/** El orden en que se ofrecen. De lo que más se busca a lo que menos. */
export const ORDEN_GRUPOS: readonly GrupoDeEvento[] = [
  'tratamiento',
  'analisis',
  'condiciones',
  'paciente',
];

/** ¿Es un grupo conocido? Para validar lo que llega por query string. */
export function esGrupoDeEvento(v: unknown): v is GrupoDeEvento {
  return typeof v === 'string' && v in GRUPOS_DE_EVENTO;
}

/** Los tipos de un grupo, para el `where` del backend. */
export function tiposDelGrupo(grupo: GrupoDeEvento): readonly TipoDeEvento[] {
  return GRUPOS_DE_EVENTO[grupo];
}

// ---------------------------------------------------------------------------
// Período
// ---------------------------------------------------------------------------

/**
 * Desde cuándo.
 *
 * Tres opciones y no un selector de fechas: el historial se recorre hacia
 * atrás, y lo que se busca es «lo de este mes» o «todo», no un rango exacto.
 * Un calendario acá sería precisión que nadie pidió a cambio de dos toques
 * más.
 */
export const PERIODOS = {
  mes: { dias: 30, nombre: 'Último mes' },
  trimestre: { dias: 90, nombre: 'Últimos 3 meses' },
  todo: { dias: null, nombre: 'Todo' },
} as const;

export type Periodo = keyof typeof PERIODOS;

export const ORDEN_PERIODOS: readonly Periodo[] = ['mes', 'trimestre', 'todo'];

export function esPeriodo(v: unknown): v is Periodo {
  return typeof v === 'string' && v in PERIODOS;
}

/**
 * La fecha de corte de un período, o `null` para «todo».
 *
 * `ahora` se pasa para poder testearlo sin depender del reloj.
 */
export function desdeCuando(periodo: Periodo, ahora = new Date()): Date | null {
  const { dias } = PERIODOS[periodo];
  if (dias === null) return null;
  return new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000);
}
