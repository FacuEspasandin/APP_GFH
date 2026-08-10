import {
  IBMPlexMono_400Regular,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import { useFonts } from 'expo-font';

/**
 * Las cinco caras que usa la app, y sólo esas.
 *
 * Cada archivo pesa y se descarga antes de que la app pinte nada, así que la
 * lista es exactamente lo que el código referencia: tres de Sans (regular,
 * semibold, bold) y dos de Mono (regular y semibold) para los números
 * clínicos. Si alguna cara nueva hace falta, se agrega acá y en
 * `tailwind.config.js` — los nombres tienen que coincidir literalmente.
 */
export function useFuentes(): boolean {
  const [listas, error] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_600SemiBold,
  });

  // Si la carga falla se sigue igual, con la tipografía del sistema. Una app
  // clínica que no abre porque no bajó una fuente es peor que una que se ve
  // distinta.
  return listas || error !== null;
}
