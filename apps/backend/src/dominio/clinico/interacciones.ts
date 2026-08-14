/**
 * Motor de interacciones fármaco-fármaco. Motor §5.
 *
 * NO hay tabla de pares. El catálogo son reglas por clase terapéutica que se
 * expanden a producto cartesiano y se cachean en memoria al boot. Una tabla de
 * 600 filas escritas a mano es imposible de mantener; con reglas por clase, una
 * estatina nueva hereda automáticamente todas las interacciones de las
 * estatinas.
 */

import { normalizar, parClave } from '@gfh/shared-types';

export type SeveridadInteraccion = 'INFORMATIVA' | 'ALTA' | 'CONTRAINDICADA';

/** Peso para comparar gravedad. Menor = más grave, igual que el rango 0-3. */
const GRAVEDAD: Record<SeveridadInteraccion, number> = {
  CONTRAINDICADA: 0,
  ALTA: 1,
  INFORMATIVA: 2,
};

export function masGrave(a: SeveridadInteraccion, b: SeveridadInteraccion): SeveridadInteraccion {
  return GRAVEDAD[a] <= GRAVEDAD[b] ? a : b;
}

/** Una regla ya resuelta: `a` y `b` son nombres de fármaco, no de lista. */
export interface Regla {
  orden: number;
  a: readonly string[];
  b: readonly string[];
  severidad: SeveridadInteraccion;
  texto: string;
}

export interface EntradaCatalogo {
  parClave: string;
  severidad: SeveridadInteraccion;
  texto: string;
  /** Qué regla ganó el par. Sirve para depurar por qué un par tiene la
   *  severidad que tiene sin releer todo el catálogo. */
  ordenRegla: number;
}

export type CatalogoInteracciones = ReadonlyMap<string, EntradaCatalogo>;

/**
 * Expande las reglas a pares. **El orden importa: la PRIMERA regla que cubre un
 * par gana.** Por eso las CONTRAINDICADA están declaradas primero. De los 638
 * pares del catálogo real, 14 están cubiertos por más de una regla — en esos
 * 14 el orden decide la severidad, y reordenar no produce ningún error.
 *
 * Los `paresExtra` de la fuente entran como reglas normales al final, con su
 * `orden` continuando la numeración.
 */
export function construirCatalogo(reglas: readonly Regla[]): CatalogoInteracciones {
  const catalogo = new Map<string, EntradaCatalogo>();

  for (const regla of [...reglas].sort((x, y) => x.orden - y.orden)) {
    for (const x of regla.a) {
      for (const y of regla.b) {
        // Un fármaco no interactúa consigo mismo.
        if (normalizar(x) === normalizar(y)) continue;

        const clave = parClave(x, y);
        if (catalogo.has(clave)) continue; // la primera gana

        catalogo.set(clave, {
          parClave: clave,
          severidad: regla.severidad,
          texto: regla.texto,
          ordenRegla: regla.orden,
        });
      }
    }
  }

  return catalogo;
}

/**
 * Todas las interacciones conocidas de un fármaco, sin paciente de referencia.
 *
 * Es lo que muestra la ficha del Buscador (funcional §6.4): la lista general de
 * reglas donde el fármaco participa. NO lleva severidad instanciada contra
 * nadie, porque acá no hay paciente — la severidad de un par depende del
 * catálogo, pero que ese par le importe a alguien depende de su medicación.
 */
export function interaccionesDe(
  nombre: string,
  catalogo: CatalogoInteracciones,
): Array<{ conNombre: string; severidad: SeveridadInteraccion; texto: string }> {
  const buscado = normalizar(nombre);

  const resultado: Array<{ conNombre: string; severidad: SeveridadInteraccion; texto: string }> = [];
  for (const [clave, entrada] of catalogo) {
    const [a, b] = clave.split('|');
    if (a !== buscado && b !== buscado) continue;
    resultado.push({
      conNombre: a === buscado ? (b ?? '') : (a ?? ''),
      severidad: entrada.severidad,
      texto: entrada.texto,
    });
  }

  const peso: Record<SeveridadInteraccion, number> = {
    CONTRAINDICADA: 0,
    ALTA: 1,
    INFORMATIVA: 2,
  };
  return resultado.sort(
    (x, y) => peso[x.severidad] - peso[y.severidad] || x.conNombre.localeCompare(y.conNombre),
  );
}

/** Todas las reglas que cubren cada par, sin deduplicar. Es lo que consume el
 *  test del invariante: sin esto no hay con qué comparar al ganador. */
export function coberturaPorPar(
  reglas: readonly Regla[],
): ReadonlyMap<string, ReadonlyArray<{ orden: number; severidad: SeveridadInteraccion }>> {
  const cobertura = new Map<string, Array<{ orden: number; severidad: SeveridadInteraccion }>>();

  for (const regla of reglas) {
    for (const x of regla.a) {
      for (const y of regla.b) {
        if (normalizar(x) === normalizar(y)) continue;
        const clave = parClave(x, y);
        const lista = cobertura.get(clave) ?? [];
        lista.push({ orden: regla.orden, severidad: regla.severidad });
        cobertura.set(clave, lista);
      }
    }
  }

  return cobertura;
}

// ---------------------------------------------------------------------------
// Detección sobre un paciente
// ---------------------------------------------------------------------------

/**
 * Un principio activo de una prescripción concreta. Hay más de uno por
 * prescripción cuando el producto es combinado: Augmentine aporta amoxicilina
 * y ácido clavulánico, y cada uno se cruza por separado.
 */
export interface ComponenteActivo {
  prescripcionId: string;
  principioActivoId: string;
  nombre: string;
}

export interface InteraccionDetectada {
  prescripcionAId: string;
  prescripcionBId: string;
  principioActivoAId: string;
  principioActivoBId: string;
  severidad: SeveridadInteraccion;
  texto: string;
  parClave: string;
}

/** Override del farmacéutico sobre un par del catálogo de código (motor §5.3). */
export interface Curacion {
  parClave: string;
  rechazado: boolean;
  severidadOverride: SeveridadInteraccion | null;
  textoOverride: string | null;
}

/**
 * Cruza todos los pares de componentes de prescripciones DISTINTAS.
 *
 * Dos componentes de la misma prescripción no se cruzan entre sí: son el mismo
 * comprimido, y el producto existe como tal en el mercado.
 *
 * El orden del par se estabiliza por id de prescripción, y el principio activo
 * de cada lado es el de su propia prescripción. Así (A,B) y (B,A) no pueden
 * coexistir y el unique de la tabla no admite duplicados.
 *
 * Los fármacos libres no entran acá: no tienen identidad que cruzar.
 */
export function detectarInteracciones(
  componentes: readonly ComponenteActivo[],
  catalogo: CatalogoInteracciones,
  curaciones: ReadonlyMap<string, Curacion> = new Map(),
): InteraccionDetectada[] {
  const detectadas: InteraccionDetectada[] = [];

  for (let i = 0; i < componentes.length; i += 1) {
    for (let j = i + 1; j < componentes.length; j += 1) {
      const uno = componentes[i]!;
      const otro = componentes[j]!;
      if (uno.prescripcionId === otro.prescripcionId) continue;

      const clave = parClave(uno.nombre, otro.nombre);
      const entrada = catalogo.get(clave);
      if (!entrada) continue;

      const curacion = curaciones.get(clave);
      if (curacion?.rechazado) continue;

      // Orden estable del par.
      const [a, b] = uno.prescripcionId <= otro.prescripcionId ? [uno, otro] : [otro, uno];

      detectadas.push({
        prescripcionAId: a.prescripcionId,
        prescripcionBId: b.prescripcionId,
        principioActivoAId: a.principioActivoId,
        principioActivoBId: b.principioActivoId,
        severidad: curacion?.severidadOverride ?? entrada.severidad,
        texto: curacion?.textoOverride ?? entrada.texto,
        parClave: clave,
      });
    }
  }

  return detectadas;
}


/**
 * Las interacciones de un fármaco, agrupadas por regla y por familia.
 *
 * La ficha las listaba planas: litio tiene 26 y las 26 comparten el MISMO
 * texto, porque salen de una sola regla contra tres familias —AINEs, IECA y
 * tiazidas—. Veintiséis renglones repitiendo la misma frase no se leen.
 *
 * La familia se reconstruye desde las listas del catálogo. Se pierde al cargar
 * —`Regla.a`/`b` ya vienen resueltas a nombres sueltos— y volver a atarla acá
 * es más barato que arrastrar los tokens crudos por todo el motor, que no los
 * necesita para nada.
 */
export interface FamiliaInteraccion {
  nombre: string;
  miembros: string[];
}

export interface GrupoInteraccion {
  severidad: SeveridadInteraccion;
  texto: string;
  familias: FamiliaInteraccion[];
  /** Los que no caen en ninguna lista: fármacos nombrados sueltos en la regla. */
  sueltos: string[];
  total: number;
}

/** A qué lista pertenece un fármaco. `null` si la regla lo nombró suelto. */
export function familiaDe(
  nombre: string,
  listas: Readonly<Record<string, readonly string[]>>,
): string | null {
  const buscado = normalizar(nombre);
  for (const [familia, miembros] of Object.entries(listas)) {
    if (miembros.some((m) => normalizar(m) === buscado)) return familia;
  }
  return null;
}

export function agruparInteracciones(
  interacciones: readonly { conNombre: string; severidad: SeveridadInteraccion; texto: string }[],
  listas: Readonly<Record<string, readonly string[]>>,
): GrupoInteraccion[] {
  // La clave del grupo es severidad + texto: es lo que identifica a la regla
  // que los generó, sin tener que arrastrar su número de orden hasta acá.
  const porRegla = new Map<string, GrupoInteraccion>();

  for (const i of interacciones) {
    const clave = `${i.severidad} ${i.texto}`;
    let grupo = porRegla.get(clave);
    if (!grupo) {
      grupo = { severidad: i.severidad, texto: i.texto, familias: [], sueltos: [], total: 0 };
      porRegla.set(clave, grupo);
    }
    grupo.total += 1;

    const familia = familiaDe(i.conNombre, listas);
    if (familia === null) {
      grupo.sueltos.push(i.conNombre);
      continue;
    }

    const existente = grupo.familias.find((f) => f.nombre === familia);
    if (existente) existente.miembros.push(i.conNombre);
    else grupo.familias.push({ nombre: familia, miembros: [i.conNombre] });
  }

  // Lo más grave primero; dentro de cada regla, la familia más numerosa
  // primero: es la que explica mejor de qué se trata la interacción.
  const peso: Record<SeveridadInteraccion, number> = {
    CONTRAINDICADA: 0,
    ALTA: 1,
    INFORMATIVA: 2,
  };

  const grupos = [...porRegla.values()];
  for (const g of grupos) {
    g.familias.sort(
      (x, y) => y.miembros.length - x.miembros.length || x.nombre.localeCompare(y.nombre),
    );
    g.sueltos.sort((x, y) => x.localeCompare(y));
    for (const fam of g.familias) fam.miembros.sort((x, y) => x.localeCompare(y));
  }

  return grupos.sort((x, y) => peso[x.severidad] - peso[y.severidad] || y.total - x.total);
}
