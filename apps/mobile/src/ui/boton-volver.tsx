import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icono } from '@/ui/iconos';
import { useColores } from '@/ui/tema';

/**
 * Volver a Bienvenida desde las pantallas de entrada.
 *
 * No usa `router.back()` a secas: a Login se llega también después de cerrar
 * sesión o de que expire el refresh, y ahí no hay nada atrás — el botón
 * quedaría muerto justo cuando el médico más necesita salir. Cuando hay
 * historial vuelve por él, y si no, va derecho a Bienvenida.
 *
 * `replace` y no `push` en ese segundo caso: Bienvenida es de donde se sale,
 * no un lugar al que se entra apilando.
 */
export function useVolverAInicio(): () => void {
  const router = useRouter();

  return () => {
    if (router.canGoBack()) router.back();
    else router.replace('/bienvenida');
  };
}

/**
 * Versión flotante, para las pantallas sin header (Login).
 *
 * Va sobre el contenido y no dentro del scroll: si scrolleara con el
 * formulario, el médico que bajó a la contraseña se quedaría sin salida
 * visible.
 */
export function BotonVolverFlotante() {
  const volver = useVolverAInicio();
  const col = useColores();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={volver}
      accessibilityRole="button"
      accessibilityLabel="Volver"
      // 44 es el mínimo tocable de las guías de Apple; el ícono es más chico,
      // el área no.
      className="absolute z-10 h-11 w-11 items-center justify-center rounded-full"
      style={{ top: insets.top + 6, left: 10 }}
      hitSlop={6}
    >
      <Icono nombre="atras" tamano={20} color={col.ink} />
    </Pressable>
  );
}

/** Versión para el `headerLeft` de las pantallas que sí tienen header. */
export function BotonVolverHeader() {
  const volver = useVolverAInicio();

  return (
    <Pressable
      onPress={volver}
      accessibilityRole="button"
      accessibilityLabel="Volver"
      className="h-11 w-11 items-center justify-center"
      hitSlop={6}
    >
      <Icono nombre="atras" tamano={20} color="#FFFFFF" />
    </Pressable>
  );
}
