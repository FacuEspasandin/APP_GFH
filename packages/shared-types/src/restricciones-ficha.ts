/**
 * Las cuatro restricciones de un fármaco, resumidas para la grilla de la ficha.
 *
 * La pantalla tenía cuatro puntitos encendidos o apagados, y dos de ellos
 * —embarazo y lactancia— estaban apagados a la fuerza porque el endpoint no
 * traía el dato. Mentían: el catálogo tiene 81 alertas de embarazo y 10 de
 * lactancia.
 *
 * Vive en `shared-types` y no en la app porque desde el freemium lo calcula el
 * BACKEND: la ficha manda el estado y la glosa —lo que es libre— y se guarda el
 * detalle para el endpoint que consume cupo. Si la app siguiera resumiendo, la
 * ficha tendría que mandarle las alertas y las tablas completas, y el muro se
 * saltearía leyendo la respuesta.
 *
 * Acá está sólo el resumen. El detalle que dibuja cada sub-pantalla —tramos,
 * trimestres, peldaños— sigue en la app: se calcula sobre lo que devuelve el
 * endpoint de detalle y no lo necesita el servidor.
 */

import type { SeveridadAlerta } from './enums';

/**
 * Cinco estados y no dos.
 *
 * `ok` sólo aparece cuando el catálogo lo AFIRMA —un tramo renal al 100 %—,
 * nunca por ausencia de dato: para eso está `sindato`, que se pinta gris y
 * dice por qué. Es la regla 5 aplicada tramo por tramo.
 *
 * `ajustar` no es gravedad: un fármaco con tabla renal no es peligroso, hay que
 * dosificarlo por clearance. Lleva el celeste de propiedad, el mismo que usa la
 * lista del buscador, y no un color de la escala clínica.
 */
export type EstadoRestriccion = 'ok' | 'evitar' | 'precaucion' | 'ajustar' | 'sindato';

export interface AlertaFicha {
  principioActivo: string;
  severidad: SeveridadAlerta;
  texto: string;
  semanaMin: number | null;
  semanaMax: number | null;
  estadoValidacion: string;
}

export interface TablaRenalFicha {
  principioActivo: string;
  via: string;
  dosisFrNormal: string;
  suplementoHd: string | null;
  rangos: Array<{ rangoTexto: string; textoRecomendacion: string | null; tipo: string }>;
}

export type ClaveRestriccion = 'embarazo' | 'lactancia' | 'renal' | 'hepatico';

export interface Restriccion {
  clave: ClaveRestriccion;
  titulo: string;
  estado: EstadoRestriccion;
  /** La línea de abajo: dice qué vas a encontrar si entrás, no qué es. */
  glosa: string;
}

/**
 * El peor de un conjunto de alertas manda.
 *
 * `INFO` cae en precaución y no en un estado propio: en una tarjeta de 150
 * píxeles, tres niveles ya son los que se distinguen de un vistazo.
 *
 * `CONTRAINDICADO` cae del lado de `evitar`. Es el nivel más duro del enum y
 * durante un tiempo caía en precaución por omisión —la condición miraba sólo
 * `EVITAR`—, así que la alerta más grave del catálogo se pintaba más suave de
 * lo que es.
 */
export function estadoDeAlertas(alertas: readonly AlertaFicha[]): EstadoRestriccion {
  if (alertas.length === 0) return 'sindato';
  return alertas.some((a) => a.severidad === 'EVITAR' || a.severidad === 'CONTRAINDICADO')
    ? 'evitar'
    : 'precaucion';
}

/**
 * Cuánta dosis queda en el peor tramo, como texto.
 *
 * Es lo que hace que la tarjeta diga algo: «baja hasta el 25 %» informa, «tiene
 * tabla» no. Si los rangos no vienen en porcentaje se cae al conteo de tramos.
 */
export function glosaRenal(tablas: readonly TablaRenalFicha[]): string {
  const rangos = tablas.flatMap((t) => t.rangos);
  if (rangos.length === 0) return 'Sin tabla';

  const minimos = rangos
    .map((r) => menorPorcentaje(r.textoRecomendacion))
    .filter((n): n is number => n !== null);

  if (minimos.length === 0) {
    return `${rangos.length} ${rangos.length === 1 ? 'tramo' : 'tramos'} de Clcr`;
  }

  const peor = Math.min(...minimos);
  return peor >= 100 ? 'Sin ajuste en ningún tramo' : `Baja hasta el ${peor} %`;
}

/**
 * El porcentaje más chico que menciona un texto de recomendación.
 *
 * Los textos vienen como «75–50 %», «100,00%» o «50-25% (Control litemia)». Se
 * toma el menor porque es el peor caso del tramo, que es lo que hay que avisar.
 * Un texto sin números devuelve `null` en vez de 0: «cada 18 h» no es cero por
 * ciento de la dosis.
 */
export function menorPorcentaje(texto: string | null): number | null {
  const nums = porcentajes(texto);
  return nums.length === 0 ? null : Math.min(...nums);
}

/**
 * Todos los porcentajes de un texto de recomendación.
 *
 * El patrón acepta el rango completo —`75–50 %`— y no sólo el número pegado al
 * signo. Buscar `\d+%` a secas devolvía 50 y perdía el 75, así que la barra de
 * la escala se dibujaba sin intervalo y el tramo parecía más duro de lo que es.
 *
 * El guión puede ser corto, medio o largo: el catálogo tiene los tres.
 *
 * Deliberadamente NO agarra cualquier número del texto. «100 % en las primeras
 * 24 h» tiene un 24 que no es un porcentaje, y tomarlo daría un mínimo falso.
 */
export function porcentajes(texto: string | null): number[] {
  if (!texto) return [];

  const patron = /(\d+(?:[.,]\d+)?)\s*(?:[-–—]\s*(\d+(?:[.,]\d+)?))?\s*%/g;
  const nums: number[] = [];

  for (const m of texto.matchAll(patron)) {
    nums.push(Number(m[1]!.replace(',', '.')));
    if (m[2] !== undefined) nums.push(Number(m[2].replace(',', '.')));
  }

  return nums;
}

export interface DatosFicha {
  embarazo: readonly AlertaFicha[];
  lactancia: readonly AlertaFicha[];
  tablasRenales: readonly TablaRenalFicha[];
  tieneAjusteHepatico: boolean;
}

/**
 * Las cuatro tarjetas, siempre las cuatro y siempre en el mismo orden.
 *
 * Ninguna se esconde por no tener dato: que la pregunta exista y la respuesta
 * falte es información. Ocultarla haría creer que el fármaco no tiene esa
 * restricción, que es lo contrario de lo que sabemos.
 */
export function restriccionesDe(f: DatosFicha): Restriccion[] {
  const embarazo = estadoDeAlertas(f.embarazo);
  const lactancia = estadoDeAlertas(f.lactancia);
  const hayRenal = f.tablasRenales.length > 0;

  return [
    {
      clave: 'embarazo',
      titulo: 'Embarazo',
      estado: embarazo,
      glosa:
        embarazo === 'sindato'
          ? 'No es lo mismo que sin riesgo'
          : glosaAlertas(f.embarazo),
    },
    {
      clave: 'lactancia',
      titulo: 'Lactancia',
      estado: lactancia,
      glosa:
        lactancia === 'sindato'
          ? 'No es lo mismo que sin riesgo'
          : (f.lactancia[0]?.texto.split(':').slice(1).join(':').trim() ||
             f.lactancia[0]?.texto ||
             ''),
    },
    {
      clave: 'renal',
      titulo: 'Función renal',
      // No es gravedad: un fármaco con tabla renal no es peligroso, hay que
      // dosificarlo. Por eso «ajustar» tiene su propio estado y su propio color.
      estado: hayRenal ? 'ajustar' : 'sindato',
      glosa: hayRenal ? glosaRenal(f.tablasRenales) : 'No es lo mismo que sin riesgo',
    },
    {
      clave: 'hepatico',
      titulo: 'Función hepática',
      estado: f.tieneAjusteHepatico ? 'ajustar' : 'sindato',
      glosa: f.tieneAjusteHepatico ? 'Por clase de Child-Pugh' : 'No es lo mismo que sin riesgo',
    },
  ];
}

/** «2 alertas · la peor en el 1er trimestre» o el texto si hay una sola. */
function glosaAlertas(alertas: readonly AlertaFicha[]): string {
  if (alertas.length === 1) {
    const t = alertas[0]!.texto;
    // Los textos vienen como «Litio en el 1er trimestre: riesgo de…». La parte
    // útil para una glosa de dos líneas es la de después de los dos puntos.
    const despues = t.split(':').slice(1).join(':').trim();
    return despues || t;
  }
  return `${alertas.length} alertas`;
}
