import { type CategoriaHallazgo, type RangoGravedad } from '@gfh/shared-types';

/**
 * Lo que el cockpit dice de un paciente, sin React de por medio.
 *
 * Vive acá y no dentro de la pantalla porque son las frases que el médico lee
 * primero —el veredicto, el desglose— y equivocarse en el plural o en la
 * categoría es equivocarse en la respuesta. Con la lógica en un `.tsx` no hay
 * forma de probarlas.
 */

export interface HallazgoResumible {
  categoria: CategoriaHallazgo;
  rango: RangoGravedad;
}

/**
 * El peor rango de cada categoría, para teñir su tarjeta.
 *
 * Ausente = la categoría no tiene ninguno. Se distingue de "rango 3" a
 * propósito: informativo es un hallazgo, la ausencia no.
 */
export function peoresPorCategoria(
  hallazgos: readonly HallazgoResumible[],
): Partial<Record<CategoriaHallazgo, RangoGravedad>> {
  const salida: Partial<Record<CategoriaHallazgo, RangoGravedad>> = {};

  for (const h of hallazgos) {
    const actual = salida[h.categoria];
    if (actual === undefined || h.rango < actual) salida[h.categoria] = h.rango;
  }

  return salida;
}

/**
 * Los hallazgos que suben al cockpit: los más graves primero, cortados.
 *
 * El resto se pide. Volcar catorce seguidos es una pared donde no se distingue
 * lo grave de lo informativo; no mostrar ninguno obliga a entrar a una
 * categoría para leer siquiera uno.
 */
export function destacados<T extends HallazgoResumible>(
  hallazgos: readonly T[],
  cuantos = 2,
): T[] {
  return [...hallazgos].sort((a, b) => a.rango - b.rango).slice(0, cuantos);
}

/**
 * El ajuste hepático no evalúa, por uno de dos motivos: falta el estado
 * hepático del paciente, o falta la tabla de ajuste por fármaco. Los dos casos
 * muestran "—": un "0" afirmaría que se miró y no había nada.
 */
export function hepaticoSinEvaluar(avisos: readonly { codigo: string }[]): boolean {
  return avisos.some((a) => a.codigo === 'SIN_CHILD_PUGH' || a.codigo === 'SIN_TABLA_HEPATICA');
}

/**
 * Las opciones del menú de los «···»: lo que se le hace a un paciente que ya
 * existe.
 *
 * Está separado del «+», que sólo crea. Función renal, hepática y embarazo
 * están acá y no allá porque las tres EDITAN campos del paciente — no agregan
 * nada— igual que «Editar paciente».
 *
 * Cada una trae el valor cargado en el subtítulo. Es lo que convierte el menú
 * en un resumen: se ve qué le falta al paciente sin tener que entrar a las
 * cuatro pantallas. Cuando no hay dato dice "Sin cargar" y no se deja en
 * blanco, porque en blanco no se distingue de "no lo trajo el servidor".
 */
export function opcionesDelPaciente(
  pacienteId: string,
  p: {
    clcrMlMin: number | null;
    clcrOrigen: string | null;
    childPughClase: string | null;
    semanaGestacion: number | null;
    estaLactando: boolean | null;
  },
): { titulo: string; ruta: string; detalle?: string; icono: NombreIconoMenu }[] {
  return [
    {
      titulo: 'Editar paciente',
      ruta: `/paciente/${pacienteId}/editar`,
      icono: 'editar',
    },
    {
      titulo: 'Función renal',
      ruta: `/paciente/${pacienteId}/datos-renales`,
      detalle:
        p.clcrMlMin === null ? 'Sin cargar' : `Clcr ${redondear(p.clcrMlMin)} mL/min`,
      icono: 'gota',
    },
    {
      titulo: 'Función hepática',
      ruta: `/paciente/${pacienteId}/datos-hepaticos`,
      detalle: p.childPughClase === null ? 'Sin cargar' : `Child-Pugh ${p.childPughClase}`,
      icono: 'higado',
    },
    {
      titulo: 'Embarazo y lactancia',
      ruta: `/paciente/${pacienteId}/embarazo-lactancia`,
      detalle: detalleGestacion(p.semanaGestacion, p.estaLactando),
      icono: 'pulso',
    },
    {
      titulo: 'Ver historial',
      ruta: `/paciente/${pacienteId}/historial`,
      detalle: 'Todo lo que se hizo con este paciente',
      icono: 'reloj',
    },
  ];
}

type NombreIconoMenu = 'editar' | 'gota' | 'higado' | 'pulso' | 'reloj';

function redondear(n: number): string {
  return String(Number(n.toFixed(1)));
}

/**
 * Las dos son independientes y las dos pueden faltar. "Sin cargar" sólo si no
 * hay ninguna: decirlo con la lactancia puesta sería falso.
 */
function detalleGestacion(semana: number | null, lactando: boolean | null): string {
  const partes: string[] = [];
  if (semana !== null) partes.push(`${semana} semanas`);
  // `false` es un dato: se preguntó y la respuesta fue no. Sólo `null` es falta
  // de dato — el mismo cuidado que en la pantalla de embarazo.
  if (lactando === true) partes.push('lactancia');
  else if (lactando === false) partes.push('sin lactancia');

  return partes.length === 0 ? 'Sin cargar' : partes.join(' · ');
}
