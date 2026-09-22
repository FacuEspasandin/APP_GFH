import type { DependenciasTools } from './tipos';

/**
 * Resuelve un principio activo a su id, aceptando id O nombre.
 *
 * Antes, TODAS las tools de fármaco exigían el id, así que el modelo tenía
 * que llamar "buscar_farmaco" primero SIEMPRE — una ida y vuelta completa
 * (con su re-lectura de caché) sólo para resolver un nombre. Con esto, el
 * caso común (un nombre que matchea un solo fármaco) se resuelve en la
 * misma llamada. Si hay ambigüedad o no hay match, tira un error claro que
 * el modelo puede leer y recién ahí caer a "buscar_farmaco" — nunca
 * adivina un id.
 */
export async function resolverPrincipioActivoId(
  deps: DependenciasTools,
  input: { principioActivoId?: string; principioActivoNombre?: string },
): Promise<string> {
  if (input.principioActivoId) return input.principioActivoId;

  if (!input.principioActivoNombre) {
    throw new Error('Falta "principioActivoId" o "principioActivoNombre".');
  }

  const resultados = await deps.catalogo.buscarPrincipiosActivos(input.principioActivoNombre, 5);

  if (resultados.length === 0) {
    throw new Error(
      `No encontré ningún principio activo para "${input.principioActivoNombre}". Probá "buscar_farmaco" para ver alternativas.`,
    );
  }
  if (resultados.length > 1) {
    const nombres = resultados.map((r) => r.nombre).join(', ');
    throw new Error(
      `Hay varias coincidencias para "${input.principioActivoNombre}": ${nombres}. Usá "buscar_farmaco" para elegir el id correcto.`,
    );
  }

  return resultados[0]!.id;
}

/** Misma idea, para las tools que reciben una LISTA de principios activos
 *  (interacciones de a pares, ajuste renal/hepático de varios a la vez). */
export async function resolverPrincipiosActivoIds(
  deps: DependenciasTools,
  input: { principioActivoIds?: string[]; principioActivoNombres?: string[] },
): Promise<string[]> {
  if (input.principioActivoIds && input.principioActivoIds.length > 0) {
    return input.principioActivoIds;
  }
  if (!input.principioActivoNombres || input.principioActivoNombres.length === 0) {
    throw new Error('Falta "principioActivoIds" o "principioActivoNombres".');
  }

  const ids: string[] = [];
  for (const nombre of input.principioActivoNombres) {
    ids.push(await resolverPrincipioActivoId(deps, { principioActivoNombre: nombre }));
  }
  return ids;
}
