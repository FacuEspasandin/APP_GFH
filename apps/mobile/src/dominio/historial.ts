/**
 * El historial del paciente: qué dice cada línea y cómo se agrupa.
 *
 * Vive acá y no en el `.tsx` para poder testearlo. Lo que decide es sobre todo
 * de lectura — cómo se llama «hoy», qué color lleva cada tipo de hecho, qué se
 * muestra cuando todavía no pasó nada — y todo eso se puede equivocar en
 * silencio si no hay un test.
 */

export type TipoEvento =
  | 'PACIENTE_CREADO'
  | 'PACIENTE_EDITADO'
  | 'FARMACO_AGREGADO'
  | 'FARMACO_EDITADO'
  | 'FARMACO_SUSPENDIDO'
  | 'FARMACO_REACTIVADO'
  | 'FARMACO_QUITADO'
  | 'CONDICION_AGREGADA'
  | 'CONDICION_QUITADA'
  | 'ALERGIA_AGREGADA'
  | 'ALERGIA_QUITADA'
  | 'DATOS_RENALES'
  | 'DATOS_HEPATICOS'
  | 'EMBARAZO_LACTANCIA'
  | 'ALTERNATIVA_ACEPTADA';

export type CambioEvento = { campo: string; antes: string | null; despues: string | null };

export type Evento = {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  detalle: string | null;
  cambios: CambioEvento[] | null;
  createdAt: string;
};

export type Historial = { eventos: Evento[]; hayMas: boolean };

/**
 * En qué familia cae cada hecho.
 *
 * Son tres y no quince a propósito: el marcador de color existe para poder
 * barrer la lista con la vista, y quince colores no se barren. Y ninguno de
 * estos es la escala de gravedad — un fármaco suspendido no es «naranja
 * atención», es una baja. Mezclar las dos escalas sería el mismo error que ya
 * cometimos una vez en las tarjetas del cockpit.
 */
export type FamiliaEvento = 'tratamiento' | 'paciente' | 'baja';

const FAMILIA: Record<TipoEvento, FamiliaEvento> = {
  PACIENTE_CREADO: 'paciente',
  PACIENTE_EDITADO: 'paciente',
  FARMACO_AGREGADO: 'tratamiento',
  FARMACO_EDITADO: 'tratamiento',
  FARMACO_SUSPENDIDO: 'baja',
  FARMACO_REACTIVADO: 'tratamiento',
  FARMACO_QUITADO: 'baja',
  CONDICION_AGREGADA: 'paciente',
  CONDICION_QUITADA: 'baja',
  ALERGIA_AGREGADA: 'paciente',
  ALERGIA_QUITADA: 'baja',
  DATOS_RENALES: 'paciente',
  DATOS_HEPATICOS: 'paciente',
  EMBARAZO_LACTANCIA: 'paciente',
  ALTERNATIVA_ACEPTADA: 'tratamiento',
};

export function familiaDe(tipo: TipoEvento): FamiliaEvento {
  // Un tipo que el backend agregue y la app todavía no conozca cae en
  // «paciente», que es el marcador neutro. Nunca se pierde la línea.
  return FAMILIA[tipo] ?? 'paciente';
}

// --- agrupado por día -------------------------------------------------------

export type DiaDeHistorial = { clave: string; titulo: string; eventos: Evento[] };

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Año-mes-día en hora LOCAL: el día del médico, no el UTC. */
function claveDeDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * «Hoy», «Ayer» o la fecha escrita.
 *
 * El año sólo aparece cuando no es el corriente: en un historial que se lee de
 * arriba hacia abajo, repetir «2026» en cada encabezado es ruido.
 */
export function tituloDeDia(fecha: Date, hoy: Date): string {
  const dias = diasDeDiferencia(fecha, hoy);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';

  const base = `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
  return fecha.getFullYear() === hoy.getFullYear() ? base : `${base} de ${fecha.getFullYear()}`;
}

function diasDeDiferencia(fecha: Date, hoy: Date): number {
  // A mediodía y no a medianoche: así el cambio de horario de verano no
  // convierte «ayer» en «hace 2 días» por una hora de corrimiento.
  const a = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12);
  const b = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Los eventos ya vienen ordenados del más nuevo al más viejo; acá se cortan por día. */
export function porDia(eventos: Evento[], hoy: Date): DiaDeHistorial[] {
  const dias: DiaDeHistorial[] = [];

  for (const e of eventos) {
    const fecha = new Date(e.createdAt);
    const clave = claveDeDia(fecha);
    const ultimo = dias[dias.length - 1];

    if (ultimo && ultimo.clave === clave) {
      ultimo.eventos.push(e);
    } else {
      dias.push({ clave, titulo: tituloDeDia(fecha, hoy), eventos: [e] });
    }
  }

  return dias;
}

/** "09:42" */
export function hora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// --- cómo se lee un cambio --------------------------------------------------

/**
 * Un antes/después en una línea.
 *
 * Los tres casos son distintos y el texto lo dice: cargar un dato que no
 * estaba, borrar uno que estaba, y cambiar uno por otro. «— → 60 kg» obliga a
 * descifrar el guión; «Sin dato» no.
 */
export function leerCambio(c: CambioEvento): { campo: string; antes: string | null; despues: string } {
  if (c.antes === null) return { campo: c.campo, antes: null, despues: c.despues ?? 'Sin dato' };
  if (c.despues === null) return { campo: c.campo, antes: c.antes, despues: 'Sin dato' };
  return { campo: c.campo, antes: c.antes, despues: c.despues };
}

/**
 * Qué se muestra cuando el paciente no tiene ni un evento.
 *
 * Sólo puede significar una cosa, y por eso el texto no consulta nada: desde
 * que existe el historial, crear un paciente escribe su primera línea. Un
 * historial vacío es un paciente anterior a la función. Decir «no pasó nada»
 * sería mentir — pasaron cosas, no se registraron.
 */
export const MOTIVO_DE_VACIO =
  'Este paciente es anterior al historial, así que lo que se hizo antes no quedó registrado. De acá en adelante sí.';
