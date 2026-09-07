/**
 * La especialidad del médico, de una lista fija.
 *
 * Existe para UNA cosa: reordenar Herramientas poniendo arriba lo que esa
 * especialidad usa más — nunca para filtrar. Las cinco herramientas que
 * cruzan el catálogo (interacciones, condición/alergia, ajuste renal,
 * ajuste hepático) las usa un cardiólogo igual que un nefrólogo, y agruparlas
 * por especialidad las metería en un cajón «transversal» que nadie abre. Ver
 * el comentario de `CATEGORIAS` en `dominio/herramientas.ts` del móvil, que
 * es donde se tomó esta decisión.
 *
 * Lista fija y no texto libre: así el mobile puede mapear cada una a las
 * categorías de herramienta que le interesan sin adivinar variantes de
 * escritura («nefro», «Nefrología», «NEFROLOGIA»).
 */
export const ESPECIALIDADES = [
  'Clínica médica',
  'Cardiología',
  'Nefrología',
  'Hepatología',
  'Geriatría',
  'Oncología',
] as const;

export type Especialidad = (typeof ESPECIALIDADES)[number];
