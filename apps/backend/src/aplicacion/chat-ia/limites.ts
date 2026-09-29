/**
 * Tope de consultas a Vera por médico — protege el margen contra un uso
 * atípico muy por encima del promedio asumido al fijar el precio (8,5/día).
 *
 * Ventana móvil de 24 h, no "desde medianoche": evita que el corte dependa
 * de en qué huso horario corre el servidor (el VPS puede arrancar en UTC,
 * los médicos están en Uruguay, UTC-3 — con medianoche fija el reset
 * ocurriría a las 21 h hora local, no a medianoche real).
 */
export const LIMITE_CONSULTAS_CHAT_24H = 10;

/** Consultas a Vera que un mismo médico puede tener en vuelo a la vez. */
export const MAX_CONSULTAS_CHAT_EN_VUELO = 2;
