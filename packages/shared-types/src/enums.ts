/**
 * Espejo en TypeScript de los enums de `schema.prisma`.
 *
 * Se declaran aca y no se importan de `@prisma/client` a proposito: la app
 * mobile tiene que poder pintar una severidad sin arrastrar el cliente de
 * Prisma. El backend valida en boot que ambos lados coincidan
 * (test `enums-espejo.spec.ts`).
 */

export const SEVERIDAD_INTERACCION = ['INFORMATIVA', 'ALTA', 'CONTRAINDICADA'] as const;
export type SeveridadInteraccion = (typeof SEVERIDAD_INTERACCION)[number];

export const SEVERIDAD_ALERTA = ['INFO', 'PRECAUCION', 'EVITAR', 'CONTRAINDICADO'] as const;
export type SeveridadAlerta = (typeof SEVERIDAD_ALERTA)[number];

export const SEVERIDAD_ALERGIA = ['LEVE', 'MODERADA', 'GRAVE'] as const;
export type SeveridadAlergia = (typeof SEVERIDAD_ALERGIA)[number];

export const NIVEL_CRUCE = ['ALTO', 'MODERADO', 'BAJO'] as const;
export type NivelCruce = (typeof NIVEL_CRUCE)[number];

export const TIPO_RANGO_AJUSTE = [
  'SIN_AJUSTE',
  'REDUCIR_DOSIS',
  'AUMENTAR_INTERVALO',
  'REDUCIR_DOSIS_Y_INTERVALO',
  'EVITAR',
  'CONTRAINDICADO',
  'PRECAUCION',
  'CONDICIONAL',
  'VACIO',
  'NOTA_AL_PIE',
] as const;
export type TipoRangoAjuste = (typeof TIPO_RANGO_AJUSTE)[number];

export const ESTADO_VALIDACION = ['PENDIENTE', 'APROBADO', 'RECHAZADO'] as const;
export type EstadoValidacion = (typeof ESTADO_VALIDACION)[number];

export const CHILD_PUGH_CLASE = ['A', 'B', 'C'] as const;
export type ChildPughClase = (typeof CHILD_PUGH_CLASE)[number];

/** Tipos de coincidencia de alergia — motor §7.3. No es un enum de Prisma: se
 *  calcula en cada evaluacion, no se persiste. */
export const TIPO_COINCIDENCIA_ALERGIA = [
  'EXACTA',
  'CRUCE_FAMILIA',
  'CRUCE_FAMILIA_AMPLIA',
] as const;
export type TipoCoincidenciaAlergia = (typeof TIPO_COINCIDENCIA_ALERGIA)[number];

/** Las 4 categorias del dashboard del cockpit (funcional §6.2). */
export const CATEGORIA_HALLAZGO = [
  'INTERACCION',
  'CONDICION', // incluye alergias
  'AJUSTE_RENAL',
  'AJUSTE_HEPATICO',
] as const;
export type CategoriaHallazgo = (typeof CATEGORIA_HALLAZGO)[number];
