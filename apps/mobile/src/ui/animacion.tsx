import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

/**
 * Transiciones de lista.
 *
 * Para qué sirven acá: cuando el médico suspende un fármaco o acepta una
 * alternativa, la lista se recalcula entera y las filas saltan de posición. Sin
 * transición no se ve *qué* cambió, sólo que algo cambió — y en una lista de
 * siete fármacos con contadores de hallazgos, eso obliga a releer todo.
 *
 * Deliberadamente sobrias: entrada y salida por opacidad, reacomodo por
 * desplazamiento. Nada de rebotes ni escalas. Es una herramienta clínica; el
 * movimiento está para explicar el cambio, no para lucirse.
 */

/** ~1 cuadro y medio a 60fps. Suficiente para leerse, corto para no estorbar. */
const DURACION = 180;

/**
 * En web las animaciones de entrada de Reanimated no llegan a ejecutarse: la
 * fila queda con `visibility: hidden` y su alto ocupado. Se ve como una lista
 * vacía cuando en realidad el contenido está ahí, que es el peor modo de fallo
 * posible — parece un problema de datos y no de render.
 *
 * Web es la superficie de verificación del proyecto, así que ahí se renderiza
 * sin animar. El movimiento es un adorno; que la lista se lea no lo es.
 */
const ANIMA = Platform.OS !== 'web';

export function FilaAnimada({
  children,
  indice = 0,
}: {
  children: ReactNode;
  /** Escalona la aparición inicial de la lista. */
  indice?: number;
}) {
  if (!ANIMA) return <View>{children}</View>;

  return (
    <Animated.View
      entering={FadeIn.duration(DURACION).delay(Math.min(indice, 8) * 25)}
      exiting={FadeOut.duration(DURACION)}
      layout={LinearTransition.duration(DURACION)}
    >
      {children}
    </Animated.View>
  );
}

/** Bloque que aparece o desaparece entero, como un aviso o un panel de error. */
export function BloqueAnimado({ children }: { children: ReactNode }) {
  if (!ANIMA) return <View>{children}</View>;

  return (
    <Animated.View
      entering={FadeIn.duration(DURACION)}
      exiting={FadeOut.duration(DURACION)}
      layout={LinearTransition.duration(DURACION)}
    >
      {children}
    </Animated.View>
  );
}
