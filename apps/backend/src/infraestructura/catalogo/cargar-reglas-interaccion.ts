/**
 * Carga las reglas de interacción desde `docs/data/reglas-interaccion.json`.
 *
 * Esta es la única capa que toca el disco: la transformación (`procesarReglasInteraccion`,
 * en `@gfh/motor-clinico`) recibe el archivo ya parseado y no sabe de dónde
 * salió. Se llama una vez al boot y el catálogo queda en memoria — consultarlo
 * después es gratis, que es lo que permite resolver la detección de un
 * paciente en un número fijo de viajes a la base (motor §5.5).
 */

import fs from 'node:fs';
import path from 'node:path';

import { procesarReglasInteraccion, type ArchivoReglas, type CargaReglas } from '@gfh/motor-clinico';

export type { CargaReglas };

export function cargarReglasInteraccion(archivo: string): CargaReglas {
  const crudo = JSON.parse(fs.readFileSync(archivo, 'utf8')) as ArchivoReglas;
  return procesarReglasInteraccion(crudo);
}

export const RUTA_REGLAS_POR_DEFECTO = path.resolve(
  __dirname,
  '../../../../../docs/data/reglas-interaccion.json',
);
