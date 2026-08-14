/**
 * Las cuatro restricciones de un fármaco, para la grilla de la ficha.
 *
 * La pantalla tenía cuatro puntitos encendidos o apagados, y dos de ellos
 * —embarazo y lactancia— estaban apagados a la fuerza porque el endpoint no
 * traía el dato. Mentían: el catálogo tiene 81 alertas de embarazo y 10 de
 * lactancia.
 *
 * Acá viven los cuatro estados posibles y de dónde sale cada uno. Vive fuera
 * del `.tsx` porque una restricción mal clasificada no rompe nada, no tira
 * ningún error y se ve sólo mirando la pantalla del fármaco correcto.
 */

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

export type SeveridadAlerta = 'EVITAR' | 'PRECAUCION' | 'INFORMATIVA';

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
 * `INFORMATIVA` cae en precaución y no en un estado propio: en una tarjeta de
 * 150 píxeles, tres niveles ya son los que se distinguen de un vistazo.
 */
export function estadoDeAlertas(alertas: readonly AlertaFicha[]): EstadoRestriccion {
  if (alertas.length === 0) return 'sindato';
  return alertas.some((a) => a.severidad === 'EVITAR') ? 'evitar' : 'precaucion';
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
function porcentajes(texto: string | null): number[] {
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

// --- embarazo: los tres trimestres -------------------------------------------

export interface Trimestre {
  numero: 1 | 2 | 3;
  nombre: string;
  desde: number;
  hasta: number;
  estado: EstadoRestriccion;
  texto: string | null;
}

const TRIMESTRES = [
  { numero: 1 as const, nombre: 'Primer trimestre', desde: 1, hasta: 13 },
  { numero: 2 as const, nombre: 'Segundo trimestre', desde: 14, hasta: 27 },
  { numero: 3 as const, nombre: 'Tercer trimestre', desde: 28, hasta: 40 },
];

/**
 * Las alertas de embarazo, repartidas en los tres trimestres.
 *
 * El catálogo las guarda con rango de semanas —o sin rango, que significa «todo
 * el embarazo»—. Una alerta «después del primer trimestre» cubre el segundo y
 * el tercero, y se muestra abierta en los dos: es lo que hace el motor cuando
 * filtra por la semana del paciente. Repartirla no agrega contenido clínico,
 * sólo lo pone donde se busca.
 */
export function porTrimestre(alertas: readonly AlertaFicha[]): Trimestre[] {
  return TRIMESTRES.map((t) => {
    const suyas = alertas.filter((a) => alcanza(a, t.desde, t.hasta));
    return {
      ...t,
      estado: estadoDeAlertas(suyas),
      texto: suyas.length === 0 ? null : peorTexto(suyas),
    };
  });
}

/** Una alerta sin rango cubre todo el embarazo. */
function alcanza(a: AlertaFicha, desde: number, hasta: number): boolean {
  const min = a.semanaMin ?? 1;
  const max = a.semanaMax ?? 45;
  return min <= hasta && max >= desde;
}

function peorTexto(alertas: readonly AlertaFicha[]): string {
  const grave = alertas.find((a) => a.severidad === 'EVITAR');
  return (grave ?? alertas[0]!).texto;
}

// --- renal: los tramos de la escala ------------------------------------------

export interface TramoRenal {
  rango: string;
  recomendacion: string;
  /**
   * Lo que la barra NO puede mostrar.
   *
   * La recomendación del catálogo suele ser sólo el porcentaje —«75–50%»— y
   * eso ya está dibujado y escrito adentro de la barra. Repetirlo abajo es
   * ruido. Lo que sí importa es la letra chica: «Control litemia estricto».
   * `null` cuando no hay nada más que el número.
   */
  nota: string | null;
  /** Para dibujar la barra: qué porción de la dosis queda. `null` si no es un %. */
  minimo: number | null;
  maximo: number | null;
  estado: EstadoRestriccion;
}

/**
 * Los tramos de una tabla renal, listos para dibujar.
 *
 * `minimo` y `maximo` salen del texto: «75–50 %» son dos números y la barra se
 * dibuja sólida hasta el mínimo y clara hasta el máximo. Pintar el promedio
 * sería inventar un valor que el catálogo no da.
 */
export function tramosRenales(tabla: TablaRenalFicha): TramoRenal[] {
  const tramos: TramoRenal[] = tabla.rangos.map((r) => {
    const nums = porcentajes(r.textoRecomendacion);
    const minimo = nums.length === 0 ? null : Math.min(...nums);
    const maximo = nums.length === 0 ? null : Math.max(...nums);

    return {
      rango: r.rangoTexto,
      recomendacion: r.textoRecomendacion ?? 'Sin recomendación cargada.',
      nota: notaDe(r.textoRecomendacion, nums.length > 0),
      minimo,
      maximo,
      // Sin ajuste es lo único que se pinta verde, y sólo cuando el catálogo lo
      // afirma con un 100 %. La ausencia de dato nunca es verde.
      estado: minimo !== null && minimo >= 100 ? 'ok' : 'precaucion',
    };
  });

  if (tabla.suplementoHd) {
    tramos.push({
      rango: 'Hemodiálisis',
      recomendacion: tabla.suplementoHd,
      nota: tabla.suplementoHd,
      minimo: null,
      maximo: null,
      estado: 'precaucion',
    });
  }

  return tramos;
}

/**
 * Le saca al texto los porcentajes que la barra ya muestra.
 *
 * «50-25% (Control litemia estricto)» deja «Control litemia estricto».
 * «100,00%» deja `null`: no queda nada que agregar.
 *
 * Si el tramo no traía porcentaje —«cada 18 h»— se devuelve entero: ahí la
 * barra no dice nada y el texto es todo lo que hay.
 */
function notaDe(texto: string | null, teniaPorcentaje: boolean): string | null {
  if (!texto) return null;
  if (!teniaPorcentaje) return texto;

  const limpio = texto
    .replace(/\d+(?:[.,]\d+)?\s*(?:[-–—]\s*\d+(?:[.,]\d+)?)?\s*%/g, '')
    .replace(/^[\s(),.;:-]+|[\s(),.;:-]+$/g, '')
    .trim();

  return limpio.length === 0 ? null : limpio;
}


// --- hepático: los tres peldaños ---------------------------------------------

export interface Peldano {
  clase: 'A' | 'B' | 'C';
  nombre: string;
  texto: string | null;
  estado: EstadoRestriccion;
}

/**
 * Los tres peldaños de Child-Pugh.
 *
 * Hoy salen los tres vacíos porque no hay tabla hepática para ningún fármaco.
 * Se muestran igual, con el peldaño punteado: que la pregunta exista y la
 * respuesta falte es información. Esconderlos haría creer que no hace falta
 * ajustar.
 */
export function peldanosHepaticos(
  filas: readonly { clase: string; texto: string | null; severidad?: string }[] = [],
): Peldano[] {
  const NOMBRES = {
    A: 'Insuficiencia leve',
    B: 'Insuficiencia moderada',
    C: 'Insuficiencia grave',
  } as const;

  return (['A', 'B', 'C'] as const).map((clase) => {
    const fila = filas.find((f) => f.clase === clase);
    if (!fila) {
      return { clase, nombre: NOMBRES[clase], texto: null, estado: 'sindato' as const };
    }
    return {
      clase,
      nombre: NOMBRES[clase],
      texto: fila.texto,
      estado:
        fila.severidad === 'EVITAR'
          ? ('evitar' as const)
          : fila.severidad === 'PRECAUCION'
            ? ('precaucion' as const)
            : ('ok' as const),
    };
  });
}

// --- nombres ------------------------------------------------------------------

/**
 * Devuelve un nombre de fármaco presentable.
 *
 * El catálogo de interacciones guarda los pares normalizados —minúsculas y sin
 * tildes— porque así los compara. Eso sirve para el motor y no para la
 * pantalla: «clonixino lisina» al lado de «Ibuprofeno» se ve como un error de
 * carga.
 *
 * Se capitaliza cada palabra salvo las cortas de unión, que en un nombre
 * comercial van en minúscula: «Ácido acetilsalicílico», no «Ácido
 * Acetilsalicílico».
 */
const SIN_CAPITALIZAR = new Set(['de', 'del', 'la', 'el', 'y', 'con', 'en']);

export function nombreLegible(nombre: string): string {
  return nombre
    .split(' ')
    .map((palabra, i) => {
      if (palabra.length === 0) return palabra;
      if (i > 0 && SIN_CAPITALIZAR.has(palabra.toLowerCase())) return palabra.toLowerCase();
      return palabra[0]!.toUpperCase() + palabra.slice(1);
    })
    .join(' ');
}

/**
 * El nombre de una familia terapéutica.
 *
 * Vienen del archivo de reglas en mayúscula sostenida —AINES, IECA, TIAZIDAS—.
 * Las siglas se quedan así porque lo son; las palabras completas pasan a caja
 * normal, que es como se leen.
 */
export function nombreFamilia(familia: string): string {
  const esSigla = familia.length <= 5 && familia === familia.toUpperCase();
  return esSigla ? familia : nombreLegible(familia.toLowerCase());
}
