import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Respuesta táctil.
 *
 * La regla: vibra lo que cambia el tratamiento del paciente o lo que el médico
 * necesita registrar sin mirar. Navegar no vibra, abrir una pantalla no vibra,
 * scrollear no vibra. Una app que responde a todo deja de comunicar nada — y en
 * una guardia, un teléfono que zumba de más se silencia, y entonces tampoco
 * avisa lo que importa.
 *
 * En web no existe y las llamadas se ignoran solas; el guard evita el ruido en
 * consola.
 */

const disponible = Platform.OS === 'ios' || Platform.OS === 'android';

/** Confirmación de algo que quedó guardado: fármaco cargado, dato editado. */
export function hapticaExito(): void {
  if (!disponible) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Algo que el médico tiene que mirar antes de seguir: alergia cruzada que pide
 * confirmación, interacción grave recién detectada.
 */
export function hapticaAdvertencia(): void {
  if (!disponible) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** El bloqueo: alergia grave exacta. Es el único que usa el patrón de error. */
export function hapticaBloqueo(): void {
  if (!disponible) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Selección dentro de una lista o un chip. El más suave de todos. */
export function hapticaSeleccion(): void {
  if (!disponible) return;
  void Haptics.selectionAsync();
}
