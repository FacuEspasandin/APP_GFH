import {
  IBMPlexMono_400Regular,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';

/**
 * Las cinco caras que usa la app, y sólo esas.
 *
 * Inter es la tipografía del rediseño de Figma ("Modernización de visual
 * app"); IBM Plex Mono se mantiene para los números clínicos —Figma no
 * define una fuente monoespaciada, y el ancho fijo de cifra ahí no es un
 * gusto visual sino lo que evita que una columna baile al cambiar de valor.
 *
 * Cada archivo pesa y se descarga antes de que la app pinte nada, así que la
 * lista es exactamente lo que el código referencia: tres de Inter (regular,
 * semibold, bold) y dos de Mono (regular y semibold). Si alguna cara nueva
 * hace falta, se agrega acá y en `tailwind.config.js` — los nombres tienen
 * que coincidir literalmente.
 */
export function useFuentes(): boolean {
  const [listas, error] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_600SemiBold,
  });

  // Si la carga falla se sigue igual, con la tipografía del sistema. Una app
  // clínica que no abre porque no bajó una fuente es peor que una que se ve
  // distinta.
  return listas || error !== null;
}
