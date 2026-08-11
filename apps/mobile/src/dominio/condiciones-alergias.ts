import { COLOR_SEVERIDAD, partesClaveAlerta, type CategoriaHallazgo } from '@gfh/shared-types';

/**
 * Lo que la lista de condiciones y alergias tiene que decir.
 *
 * La pieza delicada es `consecuenciaAlergia`: traduce severidad y tipo a lo
 * único que el médico necesita saber —si puede prescribir o no— y es la regla
 * no negociable 4 escrita como texto de pantalla.
 */

export interface AlergiaListable {
  tipo: string;
  severidad: 'LEVE' | 'MODERADA' | 'GRAVE';
  cruza: boolean;
}

export interface Consecuencia {
  texto: string;
  fondo: string;
  tinta: string;
}

/**
 * Regla 4: SÓLO la coincidencia exacta con severidad grave bloquea. El cruce
 * por familia nunca impide prescribir — pide confirmación.
 *
 * Una alergia que no cruza quedó registrada pero no coincide con ninguna
 * familia conocida, así que no dispara nada.
 */
export function consecuenciaAlergia(a: AlergiaListable): Consecuencia {
  if (!a.cruza) {
    return { texto: 'No cruza con fármacos', fondo: '#EFF2EF', tinta: '#5C6B64' };
  }
  if (a.tipo === 'EXACTA' && a.severidad === 'GRAVE') {
    return { texto: 'Impide prescribir', fondo: '#FEE2E2', tinta: '#991B1B' };
  }
  return { texto: 'Pide confirmación', fondo: '#FEF3C7', tinta: '#92400E' };
}

export function colorPorSeveridadAlergia(severidad: AlergiaListable['severidad']): string {
  if (severidad === 'GRAVE') return COLOR_SEVERIDAD.grave;
  if (severidad === 'MODERADA') return COLOR_SEVERIDAD.media;
  return COLOR_SEVERIDAD.neutro;
}

/**
 * Cuántos fármacos del tratamiento toca cada condición.
 *
 * Sale de los hallazgos que el cockpit ya calculó: la clave de una alerta
 * incluye el id de la condición y el de la prescripción, así que agrupar
 * alcanza. Se cuentan prescripciones DISTINTAS y no hallazgos — una condición
 * con dos alertas sobre el mismo fármaco toca un fármaco.
 */
export function crucesPorCondicion(
  hallazgos: readonly { clave: string; categoria: CategoriaHallazgo }[],
): Record<string, number> {
  const porCondicion = new Map<string, Set<string>>();

  for (const h of hallazgos) {
    if (h.categoria !== 'CONDICION') continue;
    const partes = partesClaveAlerta(h.clave);
    if (!partes || partes.origen !== 'CONDICION') continue;

    const set = porCondicion.get(partes.condicionId) ?? new Set<string>();
    set.add(partes.prescripcionId);
    porCondicion.set(partes.condicionId, set);
  }

  return Object.fromEntries([...porCondicion].map(([id, set]) => [id, set.size]));
}

/**
 * Sin línea mientras el cockpit no llegó: un "cruza con 0" durante la carga
 * sería falso. Una vez cargado, cero cruces se dice — una condición que no toca
 * nada del tratamiento actual es información útil, no ausencia de información.
 */
export function textoCruces(n: number | undefined, cargado: boolean): string | null {
  if (!cargado) return null;

  const cuantos = n ?? 0;
  if (cuantos === 0) return 'No cruza con el tratamiento actual';
  return cuantos === 1
    ? 'Cruza con 1 fármaco del tratamiento'
    : `Cruza con ${cuantos} fármacos del tratamiento`;
}
