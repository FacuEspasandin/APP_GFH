/** expo-notifications es un módulo nativo puro: no existe fuera del teléfono.
 *  Los tests no piden permisos ni tokens reales, sólo prueban que
 *  `notificaciones.ts` no explote al importarse desde `cliente.ts`. */
export enum AndroidImportance {
  DEFAULT = 3,
}

export function setNotificationHandler(): void {}

export async function getPermissionsAsync() {
  return { granted: true };
}

export async function requestPermissionsAsync() {
  return { granted: true };
}

export async function getExpoPushTokenAsync() {
  return { data: 'ExponentPushToken[stub]' };
}

export async function setNotificationChannelAsync() {
  return null;
}
