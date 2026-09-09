import type { CategoriaProblema, ProblemaComun } from '@/api/tipos';

/**
 * Filtro por categoría de "Solución de problemas frecuentes".
 *
 * Mismo patrón que `filtrarPorCategoria` en `dominio/herramientas.ts`: acá
 * el nombre no colisiona porque las categorías son otras, y el contenido no
 * es estático (viene del backend) — la función igual queda pura y testeada
 * aparte de la pantalla.
 */
export function filtrarPorCategoria(
  problemas: readonly ProblemaComun[],
  categoria: CategoriaProblema | null,
): ProblemaComun[] {
  if (categoria === null) return [...problemas];
  return problemas.filter((p) => p.categoria === categoria);
}

/** Las siete categorías fijas, en el orden en que se muestran los chips. El
 *  contenido (`ProblemaComun[]`) es dinámico; las etiquetas de categoría son
 *  texto de interfaz y no cambian con el contenido, por eso viven acá y no
 *  en el backend. */
export const CATEGORIAS_PROBLEMA: readonly CategoriaProblema[] = [
  'buscador',
  'cuenta',
  'notif',
  'conexion',
  'foto',
  'suscripcion',
  'general',
];

export const NOMBRE_CATEGORIA_PROBLEMA: Record<CategoriaProblema, string> = {
  buscador: 'Buscador y catálogo',
  cuenta: 'Cuenta y sesión',
  notif: 'Notificaciones',
  conexion: 'Conexión y carga',
  foto: 'Foto y tratamiento',
  suscripcion: 'Suscripción',
  general: 'General',
};
