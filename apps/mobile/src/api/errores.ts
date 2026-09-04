import * as Sentry from '@sentry/react-native';

import { limpiar, type EventoDeError } from '@/dominio/reporte-errores';

/**
 * Reporte de errores. El cableado nomás — lo que decide qué sale del teléfono
 * es `dominio/reporte-errores.ts`, que sí está testeado.
 *
 * Por qué existe: hoy, si la app se rompe en el teléfono de un médico, no nos
 * enteramos nunca. El médico ve una pantalla en blanco, cierra, y sigue.
 *
 * Sin DSN no se inicializa nada, y eso es lo normal en desarrollo: la variable
 * se define por perfil de build en `eas.json`.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function iniciarReporteDeErrores(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    /* Sin esto, Sentry adjunta IP y datos del dispositivo por su cuenta. */
    sendDefaultPii: false,
    /* Las trazas miden rendimiento mandando la URL de cada pantalla. Apagadas. */
    tracesSampleRate: 0,
    /* El doble `unknown` es porque `limpiar` declara su propia forma del
       evento —lo mínimo que toca— para no arrastrar el runtime de Sentry a un
       test. Muta y devuelve el mismo objeto, así que en tiempo de ejecución es
       exactamente el evento que entró. */
    beforeSend: (evento) => limpiar(evento as unknown as EventoDeError) as unknown as typeof evento,
    /*
     * `Console` repite cualquier `console.log` que alguien haya dejado, y
     * `Breadcrumbs` engancha los toques de pantalla — cuya etiqueta es texto
     * de la interfaz, y la interfaz muestra nombres de pacientes. El filtro ya
     * los borra; no engancharlos es la segunda cerradura.
     */
    integrations: (todas) =>
      todas.filter((i) => i.name !== 'Console' && i.name !== 'Breadcrumbs'),
  });
}

/** Para el id del médico, cuando hay sesión. Nada más que el id. */
export function marcarMedico(medicoId: string | null): void {
  if (!DSN) return;
  Sentry.setUser(medicoId ? { id: medicoId } : null);
}
