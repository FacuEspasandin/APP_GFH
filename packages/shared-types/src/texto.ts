/**
 * Normalizacion de nombres de farmaco. Vive en shared porque la usan tres
 * lugares que TIENEN que coincidir: el seed del catalogo, el matching de las
 * reglas de interaccion, y el mapeo de alergias en texto libre.
 *
 * Si divergen, una regla deja de matchear y la interaccion desaparece EN
 * SILENCIO — sin error, sin log, sin nada (motor §5.2).
 */

/** trim + lowercase + NFD sin diacriticos. `"Apixabán"`, `"apixaban"` y
 *  `" APIXABAN "` colapsan al mismo valor. */
export function normalizar(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Clave de un par de farmacos. Ordenar alfabeticamente hace que (A,B) y (B,A)
 * sean LA MISMA entrada — sin esto el catalogo tendria que declarar cada par
 * dos veces y la mitad se olvidaria.
 */
export function parClave(a: string, b: string): string {
  return [normalizar(a), normalizar(b)].sort().join('|');
}
