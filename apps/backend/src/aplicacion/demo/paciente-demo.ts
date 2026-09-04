/**
 * El paciente que ve una cuenta sin suscripción.
 *
 * No existe en la base. Se arma en memoria con datos de entrada sintéticos y se
 * pasa por el MOTOR REAL, así que sus once hallazgos son los que el catálogo
 * produce de verdad para esa combinación — no una respuesta escrita a mano que
 * se desincroniza en cuanto alguien toca una regla.
 *
 * Los ids van con un prefijo reservado y no colisionan con ningún uuid: si un
 * endpoint recibe uno de estos, la petición es sobre el demo y nunca toca
 * Postgres.
 */

export const ID_PACIENTE_DEMO = 'demo-paciente-0000-0000-000000000001';
export const ID_GRUPO_DEMO = 'demo-grupo-0000-0000-000000000001';
export const NOMBRE_GRUPO_DEMO = 'Consultorio';

/** Los ids de prescripción del demo se derivan del nombre, para ser estables. */
export const idPrescripcionDemo = (n: number) => `demo-rx-0000-0000-00000000000${n}`;

export function esDelDemo(id: string): boolean {
  return id.startsWith('demo-');
}

/**
 * Los fármacos del demo, por nombre de principio activo.
 *
 * Elegidos para que el motor encuentre algo en las CUATRO categorías: dos
 * interacciones graves, alertas por úlcera y por embarazo, cuatro ajustes
 * renales con un Clcr de 26, y —desde que existe la tabla hepática— ajuste
 * hepático sobre Warfarina, Simvastatina y Paracetamol con la clase B que
 * trae `DATOS_DEMO`. Digoxina y Enalapril no tienen tabla hepática y por eso
 * no aparecen ahí: el demo muestra el hueco real, no lo tapa.
 */
export const FARMACOS_DEMO = [
  { comercial: 'Coumadin', pas: ['Warfarina'], dosis: '5 mg', frecuencia: 'cada 24 h', via: 'ORAL' },
  // Bactrim es UN producto con dos principios activos. Cargarlo como dos
  // prescripciones lo mostraba dos veces en el tratamiento y duplicaba sus
  // interacciones — el motor evalúa por componente, la pantalla lista por
  // producto.
  {
    comercial: 'Bactrim',
    pas: ['Sulfametoxazol', 'Trimetoprim'],
    dosis: '800/160 mg',
    frecuencia: 'cada 12 h',
    via: 'ORAL',
  },
  { comercial: 'Zocor', pas: ['Simvastatina'], dosis: '20 mg', frecuencia: 'cada 24 h', via: 'ORAL' },
  { comercial: 'Digoxina', pas: ['Digoxina'], dosis: '0.25 mg', frecuencia: 'cada 24 h', via: 'ORAL' },
  { comercial: 'Paracetamol', pas: ['Paracetamol'], dosis: '500 mg', frecuencia: 'cada 8 h', via: 'ORAL' },
  { comercial: 'Enalapril', pas: ['Enalapril'], dosis: '10 mg', frecuencia: 'cada 24 h', via: 'ORAL' },
] as const;

/** Códigos de condición que el demo trae cargados. */
export const CONDICIONES_DEMO = ['HTA', 'ULCERA'] as const;

/**
 * Los datos del paciente.
 *
 * La fecha de nacimiento es fija y no relativa a hoy: si fuera «hace 78 años»,
 * la edad cambiaría sola y con ella el Clcr y las alertas de adulto mayor. Un
 * demo que cambia solo es un demo que un día muestra otra cosa.
 */
export const DATOS_DEMO = {
  nombre: 'Ana María',
  apellido: 'Rodríguez',
  fechaNacimiento: new Date('1948-03-07T00:00:00.000Z'),
  sexo: 'F' as const,
  pesoKg: 60,
  alturaCm: 158,
  creatininaMgDl: 1.6,
  semanaGestacion: 24,
  estaLactando: null,
  /**
   * Clase fija y no calculada desde los cinco criterios: el demo no guarda
   * bilirrubina/albúmina/INR porque no los muestra en ninguna pantalla, y
   * derivarla haría que un cambio en la escala moviera el demo sin que nadie
   * lo pida. B es lo que hace visible la categoría sin volverla toda roja:
   * Warfarina baja dosis, Simvastatina y Paracetamol quedan en precaución.
   */
  childPughClase: 'B' as const,
};

/**
 * La fecha con la que se evalúa el demo.
 *
 * También fija: la edad sale de restar dos fechas, y con `new Date()` el
 * paciente cumpliría años y el cockpit mostraría otro Clcr en marzo.
 */
export const HOY_DEMO = new Date('2026-01-15T12:00:00.000Z');
