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
 * Pide permiso y registra este dispositivo contra el médico logueado.
 *
 * `habilitado` es el interruptor de Perfil → Notificaciones — server-side,
 * vale para todos los dispositivos. Si está apagado, en vez de pedir permiso
 * se da de baja el token que hubiera, para no dejar un registro que el
 * backend después manda igual.
 *
 * Idempotente a propósito: se llama en cada arranque con sesión activa, y
 * pedir permiso o volver a registrar el mismo token cada vez sería ruido —
 * por eso compara contra lo último guardado antes de tocar la red.
 */
export async function sincronizarPushToken(habilitado: boolean): Promise<void> {
  if (!habilitado) {
    await desregistrarPushToken();
    return;
  }

  // `as unknown as PermissionResponse`: el tipo que expone expo-notifications
  // importa `PermissionResponse` desde `expo`, que en esta versión no lo
  // reexporta — el campo existe en tiempo de ejecución (lo pone
  // expo-modules-core), pero TypeScript no lo ve. Se castea contra la
  // interfaz real en vez de tipar todo como `any`.
  const actual = (await Notifications.getPermissionsAsync()) as unknown as PermissionResponse;
  const concedido =
    actual.granted || ((await Notifications.requestPermissionsAsync()) as unknown as PermissionResponse).granted;
  if (!concedido) return;

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
