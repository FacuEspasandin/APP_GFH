import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { iniciarSesionConGoogle } from './cliente';

/**
 * Login/registro con Google.
 *
 * El backend es la autoridad: acá sólo se abre el selector nativo de cuenta
 * y se manda el id_token que Google ya firmó a `/auth/google`, que lo
 * verifica y decide si crea cuenta, la vincula, o entra a una que ya
 * existía. Ver `Investigacion-login-social-google-apple.md` en Obsidian
 * para el porqué de cada decisión.
 */

let configurado = false;

/**
 * Se llama una vez al boot, igual que `configurarRevenueCat`. Sin los client
 * ids no rompe el arranque: el botón queda ahí pero tirar de él avisa que
 * falta configuración, en vez de la app entera fallando al abrir.
 */
export function configurarGoogleSignIn(): void {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
  if (!webClientId) {
    console.warn(
      '[Google] Sin EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB — "Continuar con Google" no va a funcionar todavía.',
    );
    return;
  }

  GoogleSignin.configure({
    webClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  });
  configurado = true;
}

/**
 * Abre el selector de cuenta nativo.
 *
 * `'cancelado'` cuando el médico cierra el selector sin elegir nada — no es
 * un error, la pantalla no debe mostrar ningún mensaje en ese caso.
 * `'nuevo'` vs. `'existente'` es lo que decide si la pantalla manda al
 * disclaimer de primer ingreso o directo a Inicio: da igual desde cuál de
 * las dos pantallas (login o registro) se tocó el botón, el resultado real
 * lo decide el backend, no de dónde vino el toque.
 */
export async function iniciarSesionGoogle(): Promise<'nuevo' | 'existente' | 'cancelado'> {
  if (!configurado) {
    throw new Error('Login con Google no está configurado en este build.');
  }

  // No-op en iOS; en Android evita el error confuso de Play Services
  // desactualizados a mitad del flujo de login.
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const respuesta = await GoogleSignin.signIn();
  if (respuesta.type !== 'success') return 'cancelado';

  const idToken = respuesta.data.idToken;
  if (!idToken) {
    throw new Error('Google no devolvió un token válido.');
  }

  const esNuevo = await iniciarSesionConGoogle(idToken);
  return esNuevo ? 'nuevo' : 'existente';
}
