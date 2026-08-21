/**
 * El molde de una calculadora, declarado.
 *
 * Clcr y Child-Pugh hacen lo mismo —piden datos y devuelven un número— y están
 * escritas a mano cada una por su lado. Cuatro decisiones clínicas quedaron
 * tomadas dos veces y distinto: dónde va el aviso de que no se guarda nada, si
 * se nombra la fórmula, qué se muestra cuando falta un dato, y dónde va el
 * límite de lo que el número **no** dice.
 *
 * Acá vive la parte que no es pantalla: la forma de la declaración y las
 * funciones puras que la interpretan. La pantalla que la dibuja está en
 * `apps/mobile`, y el motor clínico no la usa — una calculadora no cruza el
 * catálogo, y las que sí lo cruzan no entran en este molde.
 *
 * **Por qué en `shared-types` y no en el móvil.** El backend valida los mismos
 * rangos y, el día que una calculadora se guarde en un paciente, va a necesitar
 * los mismos tramos. Una escala clínica definida dos veces es dos escalas en
 * seis meses: la lección de `severidad.ts`.
 */

import type { Rango } from './rangos';
import type { ClaveColorSeveridad } from './severidad';

// ---------------------------------------------------------------------------
// 1. Las entradas
// ---------------------------------------------------------------------------

/** Una opción de un campo de elegir. `puntos` sólo en las calculadoras de puntaje. */
export interface OpcionCampo {
  valor: string;
  etiqueta: string;
  /** Cuánto suma elegir esto. Ausente en las que no puntúan. */
  puntos?: number;
}

interface CampoBase {
  clave: string;
  rotulo: string;
  /** Una línea abajo del rótulo. Para desambiguar, no para explicar la fórmula. */
  ayuda?: string;
}

/**
 * Una escala alternativa para el mismo dato.
 *
 * No es un lujo: los tres calculadores que existen la necesitan. El laboratorio
 * uruguayo informa bilirrubina en mg/dL y el europeo en µmol/L, y obligar a
 * convertir a mano antes de escribir es pedirle al médico que haga la cuenta
 * que la app existe para hacer.
 *
 * `valor` es la clave interna; `etiqueta` es cómo se escribe — el enum dice
 * `umol/L` y el médico lee «µmol/L».
 */
export interface Unidad {
  valor: string;
  etiqueta: string;
}

/**
 * Un número escrito.
 *
 * El `rango` no es decoración: de ahí sale el rótulo de qué acepta, la
 * validación y el aviso de valor raro. Ver `rangos.ts` — son dos niveles
 * distintos y confundirlos rechaza pacientes reales.
 */
export interface CampoNumero extends CampoBase {
  tipo: 'numero';
  /** La de arranque, y la única si no hay `unidades`. */
  unidad: string;
  rango: Rango;
  /**
   * Las alternativas, cada una con su propio rango.
   *
   * El rango **no se puede compartir** entre unidades: 2 mg/dL y 34 µmol/L son
   * el mismo valor, y un límite escrito para una rechazaría valores normales en
   * la otra.
   *
   * La conversión no la hace el molde: se le pasa la unidad elegida a la
   * función pura, que ya sabe convertir. Convertir acá sería una segunda
   * implementación de algo que `lipidos.ts` y `child-pugh.ts` ya resuelven.
   */
  unidades?: readonly (Unidad & { rango: Rango })[];
}

/**
 * Una elección entre pocas.
 *
 * Se toca, no se escribe. Cuando la escala no distingue 2,4 de 2,9 —las dos son
 * «2 – 3», dos puntos— pedir el número es pedir un dato más fino del que el
 * cálculo usa.
 */
export interface CampoOpcion extends CampoBase {
  tipo: 'opcion';
  opciones: readonly OpcionCampo[];
  /**
   * Las mismas bandas, reescritas en otra unidad: «< 2 mg/dL» pasa a
   * «< 34 µmol/L».
   *
   * **Los `valor` tienen que ser los mismos en todas las unidades.** Es la
   * misma banda con otro rótulo, y cambiar de unidad no puede borrar lo que el
   * médico ya contestó. Los `puntos` salen siempre de `opciones` por el mismo
   * motivo: una banda vale lo mismo se escriba como se escriba.
   */
  unidades?: readonly (Unidad & { opciones: readonly OpcionCampo[] })[];
}

export type Campo = CampoNumero | CampoOpcion;

/** Lo que el médico lleva escrito. `undefined` = sin contestar, nunca 0. */
export type Borrador = Readonly<Record<string, string | undefined>>;

/** Qué unidad eligió para cada campo. Sin entrada, la de arranque. */
export type Unidades = Readonly<Record<string, string | undefined>>;

// ---------------------------------------------------------------------------
// 2. El resultado
// ---------------------------------------------------------------------------

/**
 * Un escalón de interpretación.
 *
 * `hasta` es inclusivo y los tramos se leen en orden: el primero cuyo `hasta`
 * alcanza al valor es el que gana. El último tiene que cubrir el máximo, y hay
 * un test que lo verifica — un valor sin tramo saldría sin interpretación y en
 * silencio.
 */
export interface Tramo {
  hasta: number;
  rotulo: string;
  /** Sale de la escala clínica, no de la calculadora. Sin esto, `neutro`. */
  color?: ClaveColorSeveridad;
}

/** Una cifra contra una escala continua: el anillo del clearance. */
export interface ResultadoAnillo {
  tipo: 'anillo';
  unidad: string;
  /** Dónde termina el anillo. No es un tope clínico: es cuánto se dibuja. */
  maximo: number;
  tramos: readonly Tramo[];
}

/**
 * Se contestan ítems, se suman puntos, el puntaje cae en un tramo.
 *
 * Es la forma de Child-Pugh, CHA₂DS₂-VASc, HAS-BLED, Wells, CURB-65 y MELD.
 * Antes se llamaba «clase» y estaba atada a tres escalones, que es la salida de
 * Child-Pugh y no una forma general: Child-Pugh no devuelve una clase, devuelve
 * 8 de 15 y **por eso** clase B.
 */
export interface ResultadoPuntaje {
  tipo: 'puntaje';
  maximo: number;
  tramos: readonly Tramo[];
}

/** Una o más cifras sin escala que mostrar. Dos cifras no son otra forma. */
export interface ResultadoCifras {
  tipo: 'cifras';
  cifras: readonly { clave: string; rotulo: string; unidad: string }[];
}

export type FormaResultado = ResultadoAnillo | ResultadoPuntaje | ResultadoCifras;

// ---------------------------------------------------------------------------
// 3. El molde
// ---------------------------------------------------------------------------

/**
 * Cómo se llena.
 *
 * `cascada` abre una pregunta por vez y pliega lo contestado a un renglón.
 * `corrido` muestra todo junto.
 *
 * No es preferencia estética: **cascada donde hay criterios que elegir,
 * corrido donde hay números que escribir.** Siete criterios abiertos son dos
 * pantallas de scroll antes de contestar nada; tres campos numéricos abiertos
 * de a uno agregan un toque por campo sin sacar ningún scroll.
 */
export type ModoLlenado = 'cascada' | 'corrido';

export interface Molde {
  clave: string;
  titulo: string;
  /** Se muestra pegada al resultado y no en el encabezado: el título se pierde
   *  al scrollear, y sin la fórmula a la vista la respuesta deja de ser
   *  trazable. Regla 1. */
  formula: string;
  modo: ModoLlenado;
  campos: readonly Campo[];
  resultado: FormaResultado;
  /**
   * Qué **no** dice el número. Obligatorio a propósito.
   *
   * Es la línea que hoy cada pantalla escribe a su manera o no escribe. Que sea
   * un campo del molde es la única forma de que la calculadora número doce la
   * tenga.
   */
  limite: string;
}

// ---------------------------------------------------------------------------
// 4. Interpretación — funciones puras
// ---------------------------------------------------------------------------

/** ¿Está contestado? Vacío o sólo espacios no cuenta. */
export function contestado(b: Borrador, clave: string): boolean {
  const v = b[clave];
  return v !== undefined && v.trim() !== '';
}

/**
 * La unidad activa de un campo: la elegida, o la de arranque.
 *
 * La de arranque de un campo de opciones es la primera declarada; la de uno
 * numérico es su `unidad`, que existe aunque no haya alternativas.
 */
export function unidadDe(campo: Campo, unidades: Unidades): string {
  const elegida = unidades[campo.clave];
  if (elegida !== undefined) return elegida;
  if (campo.tipo === 'numero') return campo.unidad;
  return campo.unidades?.[0]?.valor ?? '';
}

/**
 * Las opciones a mostrar, en la unidad activa.
 *
 * Cae a las de base si la unidad no existe. Es defensivo a propósito: una
 * unidad guardada que después se saca de la declaración no puede dejar el campo
 * sin opciones, que en pantalla sería un criterio imposible de contestar.
 */
export function opcionesDe(campo: CampoOpcion, unidades: Unidades): readonly OpcionCampo[] {
  const elegida = unidades[campo.clave];
  if (elegida === undefined || campo.unidades === undefined) return campo.opciones;
  return campo.unidades.find((u) => u.valor === elegida)?.opciones ?? campo.opciones;
}

/** El rango de la unidad activa. Mismo criterio defensivo que `opcionesDe`. */
export function rangoDe(campo: CampoNumero, unidades: Unidades): Rango {
  const elegida = unidades[campo.clave];
  if (elegida === undefined || campo.unidades === undefined) return campo.rango;
  return campo.unidades.find((u) => u.valor === elegida)?.rango ?? campo.rango;
}

/** Cuántos campos contestados, para el «3 de 7» y su barra. */
export function cuantosContestados(campos: readonly Campo[], b: Borrador): number {
  return campos.filter((c) => contestado(b, c.clave)).length;
}

/** ¿Están todos? Es lo que habilita mostrar el tramo. */
export function completo(campos: readonly Campo[], b: Borrador): boolean {
  return campos.every((c) => contestado(b, c.clave));
}

/**
 * En qué tramo cae un valor.
 *
 * `null` si no hay tramo que lo cubra, que es un error de declaración y no un
 * estado del médico: devolver el último sería tapar el error mostrando una
 * interpretación equivocada.
 */
export function tramoDe(tramos: readonly Tramo[], valor: number): Tramo | null {
  return tramos.find((t) => valor <= t.hasta) ?? null;
}

/**
 * El puntaje de lo contestado hasta ahora.
 *
 * Se muestra siempre, aun incompleto — es lo que hace que la cascada no se
 * sienta un cuestionario a ciegas. Lo que **no** se muestra incompleto es el
 * tramo: cuatro de nueve con tres criterios sin contestar no es «riesgo alto»
 * ni «riesgo bajo», y decir un tramo sobre eso sería inventar. Regla 5.
 */
export function puntajeParcial(campos: readonly Campo[], b: Borrador): number {
  let total = 0;
  for (const campo of campos) {
    if (campo.tipo !== 'opcion') continue;
    const valor = b[campo.clave];
    if (valor === undefined) continue;
    total += campo.opciones.find((o) => o.valor === valor)?.puntos ?? 0;
  }
  return total;
}

/** El puntaje máximo alcanzable, para el «de 9». Sale de la declaración. */
export function puntajeMaximo(campos: readonly Campo[]): number {
  return campos.reduce((suma, campo) => {
    if (campo.tipo !== 'opcion') return suma;
    return suma + Math.max(0, ...campo.opciones.map((o) => o.puntos ?? 0));
  }, 0);
}

/**
 * Qué le falta al médico, escrito.
 *
 * Uno se nombra; dos o más se cuentan. «Faltan la albúmina y el INR» se lee;
 * «faltan la bilirrubina, la albúmina, el INR, la ascitis y la encefalopatía»
 * ya no, y a esa altura el número importa más que la lista.
 */
export function textoDeFaltantes(campos: readonly Campo[], b: Borrador): string | null {
  const faltan = campos.filter((c) => !contestado(b, c.clave));
  if (faltan.length === 0) return null;
  if (faltan.length === 1) return `falta ${faltan[0]!.rotulo.toLowerCase()}`;
  if (faltan.length === campos.length) return `faltan los ${faltan.length} datos`;
  return `faltan ${faltan.length} datos`;
}
