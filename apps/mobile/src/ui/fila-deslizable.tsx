import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAnimar } from './animacion';
import { hapticaSeleccion } from './haptica';
import { Icono, type NombreIcono } from './iconos';
import { useColores } from './tema';
import { FIJO, MOVIMIENTO, RADIO } from './tokens';

/**
 * Una fila que se desliza hacia la izquierda y muestra sus acciones.
 *
 * **Deslizar nunca ejecuta nada.** Sólo descubre los botones; cada uno es un
 * toque aparte, y el que cambia el tratamiento todavía pide confirmación y deja
 * deshacer. En una pantalla clínica un gesto accidental no puede suspender un
 * anticoagulante: por eso el gesto abre la puerta y no cruza la puerta.
 *
 * Es un atajo, no el único camino: todo lo que se hace acá también se hace entrando
 * a la fila. Por eso en web —y para quien no puede deslizar— no cambia nada.
 *
 * Armado con el gesto de `react-native-gesture-handler` y un valor compartido de
 * Reanimated, ambos ya instalados. Los botones están DETRÁS de la tarjeta y no
 * en un contenedor que recorte: recortar le comería la sombra a la tarjeta en iOS
 * (ver `RECORTA` en `superficie.tsx`).
 */

export interface AccionFila {
  etiqueta: string;
  icono: NombreIcono;
  onPress: () => void;
  /** `peligro` para lo que saca algo de las verificaciones; `primario` para el resto. */
  tono?: 'primario' | 'peligro';
}

const ANCHO_ACCION = 88;

export function FilaDeslizable({
  acciones,
  children,
  className = '',
}: {
  acciones: readonly AccionFila[];
  children: ReactNode;
  /** Cómo se ubica la fila en su lista (el margen de abajo va acá, no en la tarjeta). */
  className?: string;
}) {
  const col = useColores();
  const anima = useAnimar();
  const total = ANCHO_ACCION * acciones.length;
  const duracion = anima ? MOVIMIENTO.gesto : 0;

  const x = useSharedValue(0);
  const inicio = useSharedValue(0);
  const [abierta, setAbierta] = useState(false);

  const alTerminar = (abre: boolean) => {
    setAbierta(abre);
    if (abre) hapticaSeleccion();
  };

  const cerrar = () => {
    x.value = withTiming(0, { duration: duracion });
    setAbierta(false);
  };

  const gesto = Gesture.Pan()
    // Horizontal con decisión, y si el dedo sube o baja primero gana el scroll.
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onStart(() => {
      inicio.value = x.value;
    })
    .onUpdate((e) => {
      x.value = Math.min(0, Math.max(-total, inicio.value + e.translationX));
    })
    .onEnd((e) => {
      // Un tirón rápido decide por sí solo; si no, decide cuánto se abrió.
      const abre = e.velocityX < -600 ? true : e.velocityX > 600 ? false : x.value < -total / 2;
      x.value = withTiming(abre ? -total : 0, {
        duration: duracion,
        easing: Easing.out(Easing.cubic),
      });
      runOnJS(alTerminar)(abre);
    });

  const estiloTarjeta = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // Los botones aparecen al empezar a mover y no antes: en reposo la tarjeta los
  // tapa, y sin esto las esquinas redondeadas dejarían ver un filo de color.
  const estiloAcciones = useAnimatedStyle(() => ({ opacity: Math.min(1, -x.value / 16) }));

  if (Platform.OS === 'web') return <View className={className}>{children}</View>;

  return (
    <View className={className}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: total,
            flexDirection: 'row',
            borderRadius: RADIO.card,
            overflow: 'hidden',
          },
          estiloAcciones,
        ]}
      >
        {acciones.map((a) => (
          <Pressable
            key={a.etiqueta}
            onPress={() => {
              cerrar();
              a.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={a.etiqueta}
            style={{
              width: ANCHO_ACCION,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              backgroundColor: a.tono === 'peligro' ? col.peligro : col.primary,
            }}
          >
            <Icono
              nombre={a.icono}
              tamano={20}
              color={a.tono === 'peligro' ? FIJO.blanco : col.onPrimary}
            />
            <Text
              className="text-eyebrow font-fuerte"
              style={{ color: a.tono === 'peligro' ? FIJO.blanco : col.onPrimary }}
            >
              {a.etiqueta}
            </Text>
          </Pressable>
        ))}
      </Animated.View>

      <GestureDetector gesture={gesto}>
        <Animated.View style={estiloTarjeta}>
          {children}
          {/* Abierta, tocar la tarjeta la cierra en vez de entrar a la fila. */}
          {abierta ? (
            <Pressable
              onPress={cerrar}
              accessibilityRole="button"
              accessibilityLabel="Cerrar acciones"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
