/**
 * Las cinco restricciones que consumen cupo.
 *
 * Espeja el enum `HerramientaFicha` del esquema. Se declara aparte para poder
 * validar el parámetro de la ruta sin importar Prisma en la capa de
 * presentación — y para que agregar una restricción falle al compilar en los
 * dos lugares a la vez.
 */
export const HERRAMIENTAS_FICHA = [
  'INTERACCIONES',
  'RENAL',
  'HEPATICO',
  'EMBARAZO',
  'LACTANCIA',
] as const;

export type HerramientaDeFicha = (typeof HERRAMIENTAS_FICHA)[number];
