import type { CategoriaHallazgo, TipoRiesgoInteraccion } from '@/api/tipos';

/**
 * Qué se muestra en la pantalla de hallazgos.
 *
 * Una sola pantalla sirve cuatro cortes distintos y la diferencia está toda
 * acá, en qué se filtra. Estaba como ternarios anidados adentro del JSX y ahí
 * faltaba un caso: entrar sin parámetros —que es lo que hace «Ver los 11
 * hallazgos»— caía en el filtro por fármaco con el id vacío y no coincidía con
 * ninguno. El cockpit decía 11 y la pantalla decía que no había ninguno.
 *
 * Por eso vive en un módulo con tests: el filtro que devuelve una lista vacía
 * no rompe nada, no tira ningún error y no lo detecta ningún barrido de
 * pantallas. Sólo se ve mirando.
 */

export type Vista =
  /** Todo lo que encontró el motor, sin filtrar. */
  | { tipo: 'todos' }
  | { tipo: 'categoria'; categoria: CategoriaHallazgo }
  | { tipo: 'prescripcion'; prescripcionId: string }
  /** Los datos que faltan, que no son hallazgos sino ausencias. */
  | { tipo: 'avisos' };

export function vistaDesdeParams(p: {
  categoria?: string;
  prescripcion?: string;
  avisos?: string;
}): Vista {
  if (p.avisos === '1') return { tipo: 'avisos' };
  if (p.categoria) return { tipo: 'categoria', categoria: p.categoria as CategoriaHallazgo };
  // Un `prescripcion` vacío o ausente NO es un filtro por fármaco: es «todos».
  if (p.prescripcion) return { tipo: 'prescripcion', prescripcionId: p.prescripcion };
  return { tipo: 'todos' };
}

type HallazgoFiltrable = {
  categoria: CategoriaHallazgo;
  prescripcionIds: readonly string[];
};

/** Los hallazgos ya vienen ordenados por gravedad del backend; no se reordenan. */
export function filtrarHallazgos<T extends HallazgoFiltrable>(
  vista: Vista,
  hallazgos: readonly T[],
): T[] {
  switch (vista.tipo) {
    case 'todos':
      return [...hallazgos];
    case 'categoria':
      return hallazgos.filter((h) => h.categoria === vista.categoria);
    case 'prescripcion':
      return hallazgos.filter((h) => h.prescripcionIds.includes(vista.prescripcionId));
    case 'avisos':
      // Un aviso es una ausencia de dato, no un hallazgo. No se mezclan.
      return [];
  }
}

type AvisoFiltrable = { codigo: string; prescripcionId?: string | null };

/**
 * Los avisos que le corresponden a esta vista.
 *
 * Van con el detalle y no con el resumen: «no hay Clcr» pertenece a la
 * pantalla de ajuste renal, donde explica por qué está vacía.
 *
 * En «todos» van vacíos a propósito: el cockpit los cuenta aparte, con su
 * propia entrada, y repetirlos acá haría que el número de la pantalla no
 * coincida con el del botón que la abrió.
 */
export function filtrarAvisos<T extends AvisoFiltrable>(vista: Vista, avisos: readonly T[]): T[] {
  switch (vista.tipo) {
    case 'avisos':
      return [...avisos];
    case 'prescripcion':
      return avisos.filter((a) => a.prescripcionId === vista.prescripcionId);
    case 'categoria':
      return avisos.filter((a) => CODIGOS_POR_CATEGORIA[vista.categoria].includes(a.codigo));
    case 'todos':
      return [];
  }
}

const CODIGOS_POR_CATEGORIA: Record<CategoriaHallazgo, readonly string[]> = {
  AJUSTE_RENAL: ['SIN_CLCR', 'FARMACO_LIBRE_CLCR_BAJO'],
  AJUSTE_HEPATICO: ['SIN_CHILD_PUGH', 'SIN_TABLA_HEPATICA'],
  CONDICION: ['SIN_SEMANA_GESTACION'],
  INTERACCION: [],
};

export const TITULO_CATEGORIA: Record<CategoriaHallazgo, string> = {
  INTERACCION: 'Interacciones',
  CONDICION: 'Condiciones y alergias',
  AJUSTE_RENAL: 'Ajuste renal',
  AJUSTE_HEPATICO: 'Ajuste hepático',
};

export function tituloDeVista(vista: Vista, nombreDelFarmaco: (id: string) => string | undefined): string {
  switch (vista.tipo) {
    case 'avisos':
      return 'Datos faltantes';
    case 'categoria':
      return TITULO_CATEGORIA[vista.categoria];
    case 'prescripcion':
      return nombreDelFarmaco(vista.prescripcionId) ?? 'Hallazgos';
    case 'todos':
      return 'Todos los hallazgos';
  }
}

/** Bajada de una línea para el encabezado de la pantalla, según qué corte se esté viendo. */
export function descripcionDeVista(vista: Vista): string {
  switch (vista.tipo) {
    case 'avisos':
      return 'Datos que faltan para completar la evaluación de este paciente.';
    case 'categoria':
      return 'Ordenados por gravedad, de más a menos crítico.';
    case 'prescripcion':
      return 'Hallazgos de las verificaciones automáticas relacionados con este fármaco.';
    case 'todos':
      return 'Todo lo que encontraron las verificaciones automáticas, ordenado por gravedad.';
  }
}

const VACIO_CATEGORIA: Record<CategoriaHallazgo, string> = {
  INTERACCION: 'Ninguna interacción conocida entre los fármacos cargados.',
  CONDICION: 'Ninguna alerta por las condiciones y alergias cargadas.',
  AJUSTE_RENAL: 'Ningún fármaco necesita ajuste con este Clcr.',
  AJUSTE_HEPATICO: 'Sin tabla de ajuste hepático todavía.',
};

/**
 * Qué dice la pantalla cuando no hay nada.
 *
 * Cada vista dice por qué está vacía, y ninguna afirma más de lo que sabe: el
 * motor evaluó lo que tenía cargado, y eso no es lo mismo que «este paciente
 * está bien».
 */
export function mensajeVacio(vista: Vista): string {
  switch (vista.tipo) {
    case 'avisos':
      return 'No falta ningún dato para evaluar a este paciente.';
    case 'categoria':
      return VACIO_CATEGORIA[vista.categoria];
    case 'prescripcion':
      return 'Sin hallazgos para este fármaco.';
    case 'todos':
      return 'Ninguna verificación encontró algo con los datos cargados.';
  }
}

type HallazgoAgrupable = {
  rango: 0 | 1 | 2 | 3;
  tipoRiesgo?: TipoRiesgoInteraccion;
};

export type FilaAgrupada<T> =
  | { tipo: 'individual'; hallazgo: T }
  | { tipo: 'grupo'; tipoRiesgo: TipoRiesgoInteraccion; peor: 0 | 1 | 2 | 3; hallazgos: T[] };

/**
 * Junta las interacciones que comparten mecanismo clínico (motor §9 addendum).
 *
 * Sólo INTERACCION trae `tipoRiesgo` — condiciones y ajustes pasan de largo,
 * individuales, en su lugar de siempre. Un mecanismo con una sola interacción
 * NO arma grupo: agrupar de a uno es peor que la lista plana, agrega un
 * acordeón para abrir algo que ya se leía entero.
 *
 * El grupo aparece en la posición de su primera aparición — la lista ya viene
 * ordenada por gravedad del backend, así que eso alcanza para que lo peor
 * siga arriba.
 */
export function agruparPorRiesgo<T extends HallazgoAgrupable>(
  lista: readonly T[],
): FilaAgrupada<T>[] {
  const orden: FilaAgrupada<T>[] = [];
  const grupos = new Map<TipoRiesgoInteraccion, Extract<FilaAgrupada<T>, { tipo: 'grupo' }>>();

  for (const h of lista) {
    if (!h.tipoRiesgo) {
      orden.push({ tipo: 'individual', hallazgo: h });
      continue;
    }
    const existente = grupos.get(h.tipoRiesgo);
    if (existente) {
      existente.hallazgos.push(h);
      if (h.rango < existente.peor) existente.peor = h.rango;
      continue;
    }
    const nuevo: Extract<FilaAgrupada<T>, { tipo: 'grupo' }> = {
      tipo: 'grupo',
      tipoRiesgo: h.tipoRiesgo,
      peor: h.rango,
      hallazgos: [h],
    };
    grupos.set(h.tipoRiesgo, nuevo);
    orden.push(nuevo);
  }

  // Un grupo de uno se deshace: se lee igual que un hallazgo suelto, sin la
  // mecánica de expandir/colapsar de más.
  return orden.map((f) =>
    f.tipo === 'grupo' && f.hallazgos.length === 1
      ? { tipo: 'individual' as const, hallazgo: f.hallazgos[0]! }
      : f,
  );
}
