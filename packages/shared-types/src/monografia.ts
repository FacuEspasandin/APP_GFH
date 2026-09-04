/**
 * Las secciones de la monografía, en el orden en que se leen.
 *
 * El orden NO es el de la fuente: es el que sirve en consulta. Un médico que
 * abre la monografía de un fármaco que ya conoce entra por «Posología» o por
 * «Interacciones», no por «Descripción». Lo que se busca va arriba; lo que se
 * lee una vez, abajo.
 *
 * Vive en `shared-types` porque el backend arma la lista —decide qué secciones
 * tienen texto— y la app la dibuja. Si cada lado tuviera su copia, agregar una
 * sección obligaría a tocar dos y una de las dos se olvidaría.
 */

export type ClaveSeccion =
  | 'posologia'
  | 'interacciones'
  | 'contraindicaciones'
  | 'precauciones'
  | 'embarazo'
  | 'lactancia'
  | 'reaccionesAdversas'
  | 'usos'
  | 'descripcion';

export interface SeccionMonografia {
  clave: ClaveSeccion;
  titulo: string;
  /** La línea de abajo en la lista: dice qué vas a encontrar, no qué es. */
  glosa: string;
  texto: string;
}

/**
 * El orden y los títulos.
 *
 * Los títulos son los de la fuente y no una reescritura: «Posología» y no
 * «Cómo se da». Un médico busca la palabra que ya conoce, y renombrarla lo
 * obliga a traducir.
 */
export const SECCIONES_MONOGRAFIA: ReadonlyArray<{
  clave: ClaveSeccion;
  titulo: string;
  glosa: string;
}> = [
  { clave: 'posologia', titulo: 'Posología', glosa: 'Dosis, vía y frecuencia' },
  { clave: 'interacciones', titulo: 'Interacciones', glosa: 'Con qué fármacos y alimentos' },
  { clave: 'contraindicaciones', titulo: 'Contraindicaciones', glosa: 'Cuándo no darlo' },
  { clave: 'precauciones', titulo: 'Precauciones', glosa: 'Cuándo vigilar de cerca' },
  { clave: 'embarazo', titulo: 'Embarazo', glosa: 'Uso durante la gestación' },
  { clave: 'lactancia', titulo: 'Lactancia', glosa: 'Paso a leche y riesgo' },
  { clave: 'reaccionesAdversas', titulo: 'Reacciones adversas', glosa: 'Efectos por frecuencia' },
  { clave: 'usos', titulo: 'Indicaciones', glosa: 'Para qué está aprobado' },
  { clave: 'descripcion', titulo: 'Descripción', glosa: 'Grupo, mecanismo y farmacocinética' },
];

/**
 * Arma la lista de secciones que SÍ tienen texto.
 *
 * Una sección vacía no se muestra. Mostrarla haría creer que el fármaco no
 * tiene interacciones cuando lo que pasa es que no las cargamos — regla no
 * negociable 5, aplicada a la lista.
 */
export function seccionesDe(
  monografia: Partial<Record<ClaveSeccion, string | null>> | null | undefined,
): SeccionMonografia[] {
  if (!monografia) return [];
  return SECCIONES_MONOGRAFIA.flatMap((s) => {
    const texto = monografia[s.clave];
    return texto && texto.trim().length > 0 ? [{ ...s, texto: texto.trim() }] : [];
  });
}

/**
 * Lo que termina en punto y NO termina una oración.
 *
 * Las que importan son las que van seguidas de mayúscula, porque son las
 * únicas que engañan al corte: «Vit. E», «Vit. C», «M. avium». «Insuf. renal»
 * o «enf. de Crohn» no hacen falta —lo que sigue va en minúscula— pero se
 * incluyen igual: la lista es más fácil de leer completa que a medias.
 *
 * La inicial suelta cubre los nombres de género bacteriano, que en estas
 * fichas aparecen todo el tiempo: «S. aureus», «N. meningitidis».
 */
const ABREVIATURA = /(?:\bvit|\binsuf|\bsínd|\bsind|\benf|\baprox|\bej|\bmáx|\bmín|\bdr|\bsr|\bsra|(?:^|\s)[a-záéíóúñ])\.$/i;

/**
 * Parte el texto de una sección en oraciones, para que se lea.
 *
 * La fuente escribe telegráfico: «Insuf. hepática. Miastenia gravis.
 * Cardiopatía.» — un solo párrafo con quince afirmaciones. En un teléfono eso
 * es un muro. Cada oración como un renglón se recorre con la vista.
 *
 * Se corta por punto seguido de espacio y mayúscula, y después se vuelven a
 * pegar los cortes que cayeron sobre una abreviatura. Hacerlo en dos pasos
 * —cortar de más y después pegar— es más fácil de seguir que una sola
 * expresión con lookbehinds encadenados, y nunca pierde texto.
 */
export function enOraciones(texto: string): string[] {
  const trozos = texto.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ¿«(])/);
  const salida: string[] = [];

  for (const trozo of trozos) {
    const anterior = salida.at(-1);
    if (anterior !== undefined && ABREVIATURA.test(anterior)) {
      salida[salida.length - 1] = `${anterior} ${trozo.trim()}`;
    } else {
      salida.push(trozo.trim());
    }
  }

  return salida.filter((s) => s.length > 0);
}
