import * as LocalAuthentication from 'expo-local-authentication';

import { borrar, guardar, leer } from './almacen';

/**
 * Bloqueo con huella o cara al abrir la app.
 *
 * Por qué existe: un teléfono desbloqueado sobre un escritorio muestra la
 * medicación de un paciente a cualquiera que pase. La sesión dura días a
 * propósito —pedir la contraseña en cada guardia sería peor— así que la
 * segunda puerta es biométrica.
 *
 * Dos reglas que no se negocian:
 *
 *  1. **Apagado de fábrica.** Se prende desde Perfil, nunca solo. Una app
 *     clínica que pide huella la primera vez que se abre parece rota.
 *  2. **Nunca es la única llave.** Si la huella falla, se rechaza o el sensor
 *     no está, siempre queda entrar con la contraseña — que es lo que hace
 *     `cerrarSesion` desde la pantalla de bloqueo. Un médico que no puede ver
 *     la medicación de su paciente porque el lector no lo lee es un problema
 *     peor que el que este bloqueo resuelve.
 *
 * La preferencia es del TELÉFONO y no de la cuenta: por eso vive acá y no en
 * `/perfil/configuracion`, que se comparte entre dispositivos. Tener huella en
 * el teléfono personal y no en el de la guardia es una elección legítima.
 */

const CLAVE = 'gfh.bloqueoBiometrico';

/** ¿El teléfono tiene sensor Y algo registrado? Sin las dos cosas no se ofrece. */
export async function biometriaDisponible(): Promise<boolean> {
  const [hardware, registrado] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && registrado;
}

export async function bloqueoActivo(): Promise<boolean> {
  return (await leer(CLAVE)) === '1';
}

export async function activarBloqueo(activo: boolean): Promise<void> {
  if (activo) await guardar(CLAVE, '1');
  else await borrar(CLAVE);
}

/**
 * Pide la huella. `true` = pasa.
 *
 * `disableDeviceFallback: false` deja que el sistema ofrezca el PIN del
 * teléfono si la biometría falla — es la misma persona probando la misma
 * puerta, no una llave nueva.
 */
export async function pedirHuella(): Promise<boolean> {
  const r = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloqueá GFH',
    cancelLabel: 'Usar contraseña',
    disableDeviceFallback: false,
  });
  return r.success;
}
