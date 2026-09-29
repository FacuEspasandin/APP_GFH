import { UnprocessableEntityException } from '@nestjs/common';

/**
 * Cuánto puede cargar un médico. No son límites de producto: ningún uso clínico
 * real se acerca. Existen para que una cuenta (paga o de prueba) no pueda llenar
 * la base con filas — la base es compartida y cada fila tiene costo de
 * almacenamiento, de índices y de cada consulta que la recorre.
 */
export const TOPES = {
  pacientes: 500,
  prescripcionesPorPaciente: 60,
  condicionesPorPaciente: 60,
  alergiasPorPaciente: 60,
  grupos: 50,
  dispositivosPush: 10,
} as const;

export const CODIGO_TOPE_ALCANZADO = 'TOPE_ALCANZADO';

/** Corta si ya hay `tope` o más. `queEs` va en plural: «pacientes», «grupos». */
export function exigirTope(cantidadActual: number, tope: number, queEs: string): void {
  if (cantidadActual >= tope) {
    throw new UnprocessableEntityException({
      codigo: CODIGO_TOPE_ALCANZADO,
      mensaje: `Llegaste al máximo de ${tope} ${queEs}.`,
    });
  }
}
