import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Cierra dos formas de fuga de datos de paciente que no pasan por la red:
 * una captura de pantalla, y la miniatura que el sistema operativo guarda de
 * la app en el selector de apps recientes.
 *
 * Se activa una sola vez, para toda la vida de la app — no es una preferencia
 * del médico como el bloqueo con huella (`bloqueo.ts`): no hay ningún motivo
 * legítimo para sacarle una captura a la medicación de un paciente.
 *
 *   Android: `preventScreenCaptureAsync` sola alcanza para las dos cosas —
 *   bloquea la captura (`FLAG_SECURE`) y de paso deja en blanco la miniatura
 *   del selector de apps recientes.
 *   iOS: bloquea capturas y grabaciones (11+/13+), pero la miniatura del
 *   selector de apps es una llamada aparte (`enableAppSwitcherProtectionAsync`,
 *   sólo iOS — en Android el método nativo no existe).
 *
 * Nunca tira: en web ninguna de las dos funciones existe (confirmado en el
 * código del paquete), y un teléfono viejo puede no soportarlas. Que falte no
 * puede tumbar el arranque de la app por una protección extra.
 */
export async function activarProteccionDePantalla(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    if (await ScreenCapture.isAvailableAsync()) {
      await ScreenCapture.preventScreenCaptureAsync();
    }
  } catch {
    // Best-effort: ver arriba.
  }

  if (Platform.OS === 'ios') {
    try {
      await ScreenCapture.enableAppSwitcherProtectionAsync();
    } catch {
      // Ver arriba — además, plataforma vieja sin el método nativo.
    }
  }
}
