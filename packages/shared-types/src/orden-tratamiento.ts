import type { RangoGravedad } from './severidad';

/**
 * En qué orden se muestra el tratamiento activo.
 *
 * Hasta ahora no había ninguno: la consulta de prescripciones no tenía
 * `orderBy`, así que el orden lo elegía Postgres y podía cambiar entre dos
 * aperturas del cockpit sin que hubiera pasado nada. El fármaco contraindicado
 * quedaba donde caía.
 *
 * **Primero la gravedad, después la cantidad.** Ordenar sólo por cantidad
 * —que fue la primera idea— entierra lo que más importa: un fármaco con 1
 * hallazgo contraindicado quedaría debajo de uno con 5 informativos, y la fila
 * más roja de la pantalla terminaría más abajo que la más gris. La cantidad
 * desempata **dentro** de cada gravedad, que es donde comparar dos números
 * significa algo.
 *
 * Vive acá y no en la pantalla porque el mismo orden lo tienen que producir el
 * cockpit y el paciente de ejemplo, que arman su lista en servicios distintos.
 * Y con tests porque un comparador equivocado no rompe nada: devuelve la lista
 * completa, en el orden que no es, sin un solo error.
 */

export interface FilaOrdenable {
  /** El peor rango que toca a este fármaco. `null` = ninguno lo toca. */
  espina: number | null;
  conteoHallazgos: number;
  /** Escrito a mano: no resuelve a ningún principio activo, no se verifica. */
  esFarmacoLibre: boolean;
  nombre: string;
}

/**
 * Los tres grupos, en orden de aparición.
 *
 * Los dos últimos muestran los dos un «—», pero no son el mismo caso y por eso
 * no van juntos: uno pasó las cinco verificaciones y no saltó nada, el otro no
 * se verificó. Mezclarlos daría a entender que los dos están limpios, que es
 * pintar una ausencia de dato como tranquilidad — la regla 5.
 */
function grupo(f: FilaOrdenable): 0 | 1 | 2 {
  if (f.esFarmacoLibre) return 2;
  return f.espina === null ? 1 : 0;
}

/**
 * Sin hallazgos ordena al final de su grupo, no al principio.
 *
 * `null` no es "rango -1": no tener hallazgos es lo contrario de tener el peor.
 * Se mapea a un número más alto que cualquier rango real para que el `-` de la
 * resta lo mande abajo.
 */
const SIN_HALLAZGOS = 99;

/**
 * El comparador. Estable y total: dos fármacos nunca empatan del todo, porque
 * el último desempate es el nombre.
 *
 * Sin ese último desempate, dos fármacos con la misma gravedad y la misma
 * cantidad quedarían en el orden que traiga la base — y volveríamos a tener una
 * lista que se mueve sola entre aperturas.
 */
export function compararFilasTratamiento(a: FilaOrdenable, b: FilaOrdenable): number {
  return (
    grupo(a) - grupo(b) ||
    (a.espina ?? SIN_HALLAZGOS) - (b.espina ?? SIN_HALLAZGOS) ||
    b.conteoHallazgos - a.conteoHallazgos ||
    a.nombre.localeCompare(b.nombre, 'es')
  );
}

/** Copia ordenada: no muta lo que recibe. */
export function ordenarTratamiento<T extends FilaOrdenable>(filas: readonly T[]): T[] {
  return [...filas].sort(compararFilasTratamiento);
}

/**
 * Recordatorio de tipos: `espina` viaja como `number | null` en la respuesta del
 * cockpit, pero los valores que toma son los de `RangoGravedad`. Esto no se usa
 * en runtime; está para que un cambio en la escala rompa acá y no en silencio.
 */
export type EspinaEsUnRango = RangoGravedad | null;
