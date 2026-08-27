/**
 * AsyncStorage fuera del teléfono.
 *
 * El módulo real toca `window` al importarse y en Node eso revienta antes de
 * llegar a ninguna aserción. Acá alcanza con un mapa: lo que se prueba de
 * `persistencia.ts` es QUÉ se guarda —la línea entre catálogo y paciente— y
 * no cómo se escribe en disco.
 */
const memoria = new Map<string, string>();

export default {
  getItem: async (k: string) => memoria.get(k) ?? null,
  setItem: async (k: string, v: string) => void memoria.set(k, v),
  removeItem: async (k: string) => void memoria.delete(k),
};
