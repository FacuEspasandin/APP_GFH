/**
 * Alergias por familia. Motor §7.
 *
 * El hueco que cierra: una alergia a Amoxicilina que solo mira Amoxicilina deja
 * que el sistema sugiera Ampicilina —misma familia— como alternativa "segura".
 */

import {
  bloqueaPrescripcion,
  rangoPorAlergia,
  requiereConfirmacion,
  type NivelCruce,
  type RangoGravedad,
  type SeveridadAlergia,
  type TipoCoincidenciaAlergia,
} from '@gfh/shared-types';
import { normalizar } from '@gfh/shared-types';

export interface GrupoAlergenico {
  id: string;
  codigo: string;
  nombre: string;
  nivelCruce: NivelCruce;
  grupoPadreId: string | null;
  sinonimos: readonly string[];
}

export interface AlergiaPaciente {
  id: string;
  severidad: SeveridadAlergia;
  /** FARMACOLOGICA: el principio activo exacto. */
  principioActivoId: string | null;
  /** Resuelto desde texto libre en las GENERAL, o el grupo del PA. */
  grupoAlergenicoId: string | null;
}

export interface Coincidencia {
  alergiaId: string;
  tipo: TipoCoincidenciaAlergia;
  severidad: SeveridadAlergia;
  nivelCruce: NivelCruce | null;
  grupoNombre: string | null;
  rango: RangoGravedad;
  bloquea: boolean;
  requiereConfirmacion: boolean;
}

/**
 * Evalúa un principio activo candidato contra las alergias del paciente.
 *
 * Tres tipos de coincidencia, de más a menos cercana:
 *   EXACTA               el fármaco ES el PA de la alergia
 *   CRUCE_FAMILIA        comparten grupo alergénico → usa el nivelCruce del grupo
 *   CRUCE_FAMILIA_AMPLIA grupos hermanos bajo el mismo padre → nivelCruce del PADRE
 *
 * El nivelCruce de un grupo describe cuánto cruzan sus MIEMBROS ENTRE SÍ; hacia
 * los primos se usa el del padre, que es menor. En el catálogo real:
 * BETALACTAMICOS(BAJO) → PENICILINAS(ALTO), CEFALOSPORINAS(ALTO), CARBAPENEMS(ALTO).
 */
export function evaluarAlergias(
  candidato: { principioActivoId: string; gruposIds: readonly string[] },
  alergias: readonly AlergiaPaciente[],
  grupos: ReadonlyMap<string, GrupoAlergenico>,
): Coincidencia[] {
  const resultado: Coincidencia[] = [];
  const gruposCandidato = new Set(candidato.gruposIds);
  const padresCandidato = new Set(
    candidato.gruposIds.map((id) => grupos.get(id)?.grupoPadreId).filter((x): x is string => !!x),
  );

  for (const alergia of alergias) {
    let tipo: TipoCoincidenciaAlergia | null = null;
    let grupo: GrupoAlergenico | null = null;

    if (alergia.principioActivoId && alergia.principioActivoId === candidato.principioActivoId) {
      tipo = 'EXACTA';
      grupo = alergia.grupoAlergenicoId ? (grupos.get(alergia.grupoAlergenicoId) ?? null) : null;
    } else if (alergia.grupoAlergenicoId && gruposCandidato.has(alergia.grupoAlergenicoId)) {
      tipo = 'CRUCE_FAMILIA';
      grupo = grupos.get(alergia.grupoAlergenicoId) ?? null;
    } else if (alergia.grupoAlergenicoId) {
      const grupoAlergia = grupos.get(alergia.grupoAlergenicoId);
      const padreAlergia = grupoAlergia?.grupoPadreId ?? null;
      // Hermanos: distinto grupo, mismo padre. También cuenta que el padre de
      // la alergia sea el grupo del candidato, o viceversa.
      const sonHermanos =
        (padreAlergia !== null && padresCandidato.has(padreAlergia)) ||
        (padreAlergia !== null && gruposCandidato.has(padreAlergia));
      if (sonHermanos) {
        tipo = 'CRUCE_FAMILIA_AMPLIA';
        // El cruce hacia los primos usa el nivelCruce del PADRE.
        grupo = (padreAlergia ? grupos.get(padreAlergia) : undefined) ?? grupoAlergia ?? null;
      }
    }

    if (tipo === null) continue;

    const nivelCruce = tipo === 'EXACTA' ? null : (grupo?.nivelCruce ?? null);

    resultado.push({
      alergiaId: alergia.id,
      tipo,
      severidad: alergia.severidad,
      nivelCruce,
      grupoNombre: grupo?.nombre ?? null,
      rango: rangoPorAlergia(alergia.severidad, tipo, nivelCruce ?? undefined),
      bloquea: bloqueaPrescripcion(alergia.severidad, tipo),
      requiereConfirmacion: requiereConfirmacion(alergia.severidad, tipo),
    });
  }

  return resultado;
}

/**
 * Mapea una alergia en texto libre a un grupo alergénico. Motor §7.4.
 *
 * Se compara normalizado contra `nombre` y `sinonimos` — el médico escribe
 * "Sulfas", no el código del catálogo. Sin match, la alergia SE REGISTRA IGUAL,
 * solo que no cruza con fármacos: nunca se inventa una familia.
 */
export const MIN_CARACTERES_MAPEO = 3;

export function mapearTextoLibreAGrupo(
  texto: string,
  grupos: Iterable<GrupoAlergenico>,
): GrupoAlergenico | null {
  const buscado = normalizar(texto);
  if (buscado.length < MIN_CARACTERES_MAPEO) return null;

  for (const grupo of grupos) {
    if (normalizar(grupo.nombre) === buscado) return grupo;
    if (grupo.sinonimos.some((s) => normalizar(s) === buscado)) return grupo;
  }
  return null;
}
