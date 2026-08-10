import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Guardado de tokens.
 *
 * En device va a SecureStore (Keychain / Keystore). En web SecureStore no
 * existe, así que cae a localStorage — que NO es equivalente en seguridad y
 * sirve solo para el preview de desarrollo. La app de producción es nativa.
 */
const esWeb = Platform.OS === 'web';

export async function guardar(clave: string, valor: string): Promise<void> {
  if (esWeb) {
    globalThis.localStorage?.setItem(clave, valor);
    return;
  }
  await SecureStore.setItemAsync(clave, valor);
}

export async function leer(clave: string): Promise<string | null> {
  if (esWeb) return globalThis.localStorage?.getItem(clave) ?? null;
  return SecureStore.getItemAsync(clave);
}

export async function borrar(clave: string): Promise<void> {
  if (esWeb) {
    globalThis.localStorage?.removeItem(clave);
    return;
  }
  await SecureStore.deleteItemAsync(clave);
}

export const CLAVE_ACCESS = 'gfh.accessToken';
export const CLAVE_REFRESH = 'gfh.refreshToken';
