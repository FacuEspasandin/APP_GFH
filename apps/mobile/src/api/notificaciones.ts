import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import type { PermissionResponse } from 'expo-modules-core';
import { Platform } from 'react-native';

import { borrar, guardar, leer } from './almacen';
import { api } from './cliente';

/** No clínicas — nunca un dato de paciente. Ver `push.service.ts` en el
 *  backend, que es donde vive la lista completa y la regla. */

const CLAVE_PUSH_TOKEN = 'gfh.pushToken';

/* Sin esto, una notificación que llega con la app abierta no se muestra —
 * por defecto expo-notifications la descarta en primer plano. Se registra
 * una sola vez, al importar este módulo. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Si el teléfono ya dio permiso para mostrar notificaciones.
 *
 * `as unknown as PermissionResponse`: el tipo que expone expo-notifications
 * importa `PermissionResponse` desde `expo`, que en esta versión no lo
 * reexporta — el campo existe en tiempo de ejecución (lo pone
 * expo-modules-core), pero TypeScript no lo ve. Se castea contra la interfaz
 * real en vez de tipar todo como `any`.
 */
export async function permisoDeNotificaciones(): Promise<boolean> {
  const actual = (await Notifications.getPermissionsAsync()) as unknown as PermissionResponse;
  return actual.granted;
}

/**
 * El pedido de permiso, a pedido del médico y con contexto.
 *
 * Es lo único que abre el diálogo del sistema. Antes se abría solo, en el primer
 * arranque con sesión, sin que nadie hubiera dicho que quería notificaciones:
 * Apple lo rechaza (guideline 4.5.4) porque los avisos de GFH incluyen
 * recordatorios de uso, que son promocionales y exigen un sí explícito con el
 * texto delante. Se llama desde Perfil → Notificaciones, al prender el
 * interruptor, con ese texto en pantalla.
 *
 * Devuelve `true` si quedó activado. Si el médico ya había negado el permiso, el
 * sistema no vuelve a preguntar: la pantalla lo manda a Ajustes.
 */
export async function activarNotificaciones(): Promise<boolean> {
  const pedido = (await Notifications.requestPermissionsAsync()) as unknown as PermissionResponse;
  if (!pedido.granted) return false;
  await registrarToken();
  return true;
}

/**
 * Registra este dispositivo contra el médico logueado — SIN pedir permiso.
 *
 * `habilitado` es el interruptor de Perfil → Notificaciones — server-side,
 * vale para todos los dispositivos. Si está apagado, se da de baja el token que
 * hubiera, para no dejar un registro que el backend después manda igual. Si
 * está prendido pero el teléfono no dio permiso, no se hace nada y NO se pregunta
 * (ver `activarNotificaciones`).
 *
 * Idempotente a propósito: se llama en cada arranque con sesión activa, y
 * volver a registrar el mismo token cada vez sería ruido — por eso compara
 * contra lo último guardado antes de tocar la red.
 */
export async function sincronizarPushToken(habilitado: boolean): Promise<void> {
  if (!habilitado) {
    await desregistrarPushToken();
    return;
  }

  if (!(await permisoDeNotificaciones())) return;
  await registrarToken();
}

async function registrarToken(): Promise<void> {
  // Sin proyecto de EAS vinculado (falta `eas init`), pedir el token explota
  // en vez de devolver null — se corta acá con un aviso, mismo criterio que
  // el resto de las claves externas de la app (Sentry, RevenueCat).
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    console.warn('[push] Sin projectId de EAS — correr "eas init" antes de poder registrar el dispositivo.');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  const yaRegistrado = await leer(CLAVE_PUSH_TOKEN);
  if (yaRegistrado === token) return;

  await api.post('/perfil/push-token', {
    token,
    plataforma: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
  });
  await guardar(CLAVE_PUSH_TOKEN, token);
}

/** Al cerrar sesión, o al apagar el interruptor: usa el token que ya estaba
 *  guardado — no hace falta pedírselo de nuevo al sistema operativo para
 *  poder darlo de baja. */
export async function desregistrarPushToken(): Promise<void> {
  const token = await leer(CLAVE_PUSH_TOKEN);
  if (!token) return;
  try {
    await api.post('/perfil/push-token/eliminar', { token });
  } finally {
    await borrar(CLAVE_PUSH_TOKEN);
  }
}
