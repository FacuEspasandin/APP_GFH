/**
 * Fuente de fichas técnicas para el RAG del chat con IA — abstraída a
 * propósito.
 *
 * Hoy hay una sola implementación (`fuente-fichas-local.ts`), que lee las
 * ~30 fichas de desarrollo (`prisma/datos/monografias-texto.json`). El día
 * que exista la API de Farmanuario, se agrega `fuente-fichas-farmanuario.ts`
 * implementando esta misma interfaz y se cambia `obtenerFuenteFichas()` —
 * el resto del pipeline (chunking, embeddings, tabla `ficha_embedding`, la
 * tool de búsqueda) no se toca.
 */

export interface SeccionFicha {
  /** ej. "Posología", "Contraindicaciones" — se antepone al texto del chunk
   *  para que el embedding sepa de qué parte de la ficha es. */
  titulo: string;
  texto: string;
}

export interface FichaCruda {
  /** Nombre del principio activo, tal como aparece en `PrincipioActivo.nombre`
   *  — se resuelve contra la tabla vía `normalizar()`, nunca por id: la fuente
   *  no conoce los ids internos del catálogo. */
  nombrePrincipioActivo: string;
  secciones: SeccionFicha[];
}

export interface FuenteFichas {
  listarFichas(): Promise<FichaCruda[]> | FichaCruda[];
}
