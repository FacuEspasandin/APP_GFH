/**
 * Carga el contenido de la pantalla de Ayuda desde `docs/data/`.
 *
 * A diferencia de las reglas de interacción, acá no hay transformación: el
 * archivo ya tiene la forma que necesita la app. Vive en `docs/data/` y no
 * hardcodeado en el bundle del móvil a propósito — cambiar una pregunta es
 * editar el JSON y redeployar, sin build nuevo ni revisión de tienda.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

export type CategoriaProblema =
  | 'buscador'
  | 'cuenta'
  | 'notif'
  | 'conexion'
  | 'foto'
  | 'suscripcion'
  | 'general';

export interface ProblemaComun {
  categoria: CategoriaProblema;
  titulo: string;
  descripcion: string;
}

export function cargarAyudaFaq(archivo: string): PreguntaFrecuente[] {
  return JSON.parse(fs.readFileSync(archivo, 'utf8')) as PreguntaFrecuente[];
}

export function cargarAyudaProblemas(archivo: string): ProblemaComun[] {
  return JSON.parse(fs.readFileSync(archivo, 'utf8')) as ProblemaComun[];
}

export const RUTA_AYUDA_FAQ_POR_DEFECTO = path.resolve(
  __dirname,
  '../../../../../docs/data/ayuda-faq.json',
);

export const RUTA_AYUDA_PROBLEMAS_POR_DEFECTO = path.resolve(
  __dirname,
  '../../../../../docs/data/ayuda-problemas.json',
);
