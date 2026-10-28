import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Text, View, type TextStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';

import { MOVIMIENTO } from './tokens';

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

const DURACION = MOVIMIENTO.base;

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

/**
 * ¿Se anima? No en web (ver arriba) y no si el sistema pidió «reducir
 * movimiento». Todo el movimiento de la app pregunta acá, así la preferencia se
 * respeta en un solo lugar.
 */
export function useAnimar(): boolean {
  const reducido = useReducedMotion();
  return ANIMA && !reducido;
}

export function FilaAnimada({
  children,
  indice = 0,
}: {
  children: ReactNode;
  /** Escalona la aparición inicial de la lista. */
  indice?: number;
}) {
  const anima = useAnimar();
  if (!anima) return <View>{children}</View>;

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
  const anima = useAnimar();
  if (!anima) return <View>{children}</View>;

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

/**
 * Un número que viaja hasta su valor.
 *
 * Dibujado con un temporizador de JS y no con Reanimated: son uno o dos
 * números chicos por pantalla, y así corre igual en el teléfono y en web —que
 * es donde se verifica— sin un camino aparte para cada uno.
 *
 * `soloAlMontar`: cuenta desde cero cuando la pantalla se abre y después cambia
 * de golpe. Es para cifras que se calculan mientras se escribe: un resultado
 * clínico que se está escribiendo tiene que mostrar el valor exacto ya, no uno
 * que lo alcanza medio segundo después. Sin él, cada cambio también se desliza.
 *
 * Termina SIEMPRE en el valor exacto, no en una aproximación.
 */
export function useInterpolado(
  objetivo: number,
  { duracion = MOVIMIENTO.cifra, soloAlMontar = false }: { duracion?: number; soloAlMontar?: boolean } = {},
): number {
  const anima = useAnimar();
  const [valor, setValor] = useState(anima ? 0 : objetivo);
  const actual = useRef(valor);
  const montado = useRef(false);

  useEffect(() => {
    const primera = !montado.current;
    montado.current = true;

    if (!anima || (soloAlMontar && !primera)) {
      actual.current = objetivo;
      setValor(objetivo);
      return;
    }

    const desde = actual.current;
    const inicio = Date.now();
    let cuadro = 0;

    const paso = () => {
      const p = Math.min(1, (Date.now() - inicio) / duracion);
      // Frena al llegar: así el ojo lee el valor final, que es el que importa.
      const v = p === 1 ? objetivo : desde + (objetivo - desde) * (1 - (1 - p) ** 3);
      actual.current = v;
      setValor(v);
      if (p < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);

    return () => cancelAnimationFrame(cuadro);
  }, [objetivo, anima, duracion, soloAlMontar]);

  return valor;
}

/** Cuántos decimales trae un número, para mostrarlo con los mismos mientras cuenta. */
export function decimalesDe(n: number): number {
  return (String(n).split('.')[1] ?? '').length;
}

/** Una cifra que cuenta hasta su valor al aparecer (ver `useInterpolado`). */
export function CifraAnimada({
  valor,
  className,
  style,
}: {
  valor: number;
  className?: string;
  style?: TextStyle;
}) {
  const mostrado = useInterpolado(valor, { soloAlMontar: true });
  return (
    <Text className={className} style={style}>
      {mostrado.toFixed(decimalesDe(valor))}
    </Text>
  );
}
