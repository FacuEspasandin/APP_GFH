import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icono } from '@/ui/iconos';
import { useColores } from '@/ui/tema';

/**
 * La barra superior del rediseño de Figma ("Modernización de visual app").
 *
 * Reemplaza al header nativo de `Stack` pantalla por pantalla — no es un
 * cambio global: cada pantalla que ya tiene su frame en Figma se pasa a
 * `headerShown: false` y renderiza esto en su lugar; las que todavía no
 * tienen frame conservan el header verde de siempre. Ver
 * `14-progreso-rediseno-figma.md` para cuáles son cuáles.
 *
 * El botón de la izquierda vuelve por default. En los frames de Figma que ya
 * vimos (Pacientes, Cockpit del Paciente) aparece en TODAS las pantallas,
 * incluida la raíz de la sección "Pacientes" que no tiene a dónde volver —
 * ahí probablemente abre otra cosa (¿un menú?), pero eso todavía no está
 * definido en el archivo. `alVolver` lo deja abierto para cuando se sepa.
 */
export function EncabezadoApp({
  alVolver,
  ocultarVolver,
  derecha,
}: {
  alVolver?: () => void;
  /** Para los pasos obligatorios (el disclaimer de primer ingreso) donde no
   *  tiene que haber ninguna salida — ni volver, ni un ícono que parezca
   *  serlo. */
  ocultarVolver?: boolean;
  derecha?: ReactNode;
}) {
  const router = useRouter();
  const col = useColores();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between border-b px-5"
      style={{
        height: 64 + insets.top,
        paddingTop: insets.top,
        backgroundColor: col.surface,
        borderColor: col.line,
      }}
    >
      {/* El fondo blanco necesita íconos oscuros — el resto de la app pide
          `light` (barra verde) desde el layout raíz. */}
      <StatusBar style="dark" />
      {ocultarVolver ? (
        <View className="h-10 w-10" />
      ) : (
        <Pressable
          onPress={alVolver ?? (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Icono nombre="atras" tamano={18} color={col.ink} />
        </Pressable>
      )}

      <Text className="font-fuerte text-[32px] tracking-[-0.8px]" style={{ color: '#005228' }}>
        GFH
      </Text>

      <View className="h-10 w-10 items-center justify-center">{derecha}</View>
    </View>
  );
}

/**
 * Volver + título de la pantalla, blanco — para el detalle "de segundo
 * nivel" (Umbral de edad, Crear cuenta): ya no está en la marca, está
 * resolviendo una tarea puntual, así que el título dice cuál.
 */
export function EncabezadoConTitulo({
  titulo,
  alVolver,
  cierra,
}: {
  titulo: string;
  /** Por si `router.back()` no alcanza — ver `useVolverAInicio` para las
   *  pantallas de entrada, a las que a veces se llega sin historial. */
  alVolver?: () => void;
  /** Para las tareas puntuales que cuelgan del cockpit (cargar un dato,
   *  agregar una condición): una `X` que cierra en vez de una flecha que
   *  "vuelve" — la tarea no tiene un lugar anterior al que continuar, tiene
   *  un fin. */
  cierra?: boolean;
}) {
  const col = useColores();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center gap-2 border-b px-2"
      style={{ paddingTop: insets.top, backgroundColor: col.surface, borderColor: col.line }}
    >
      <StatusBar style="dark" />
      <Pressable
        onPress={alVolver ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel={cierra ? 'Cerrar' : 'Volver'}
        hitSlop={8}
        className="h-16 w-12 items-center justify-center"
      >
        <Icono nombre={cierra ? 'cerrar' : 'atras'} tamano={cierra ? 16 : 18} color={col.ink} />
      </Pressable>
      <Text className="text-fila font-fuerte" style={{ color: '#005228' }}>
        {titulo}
      </Text>
    </View>
  );
}

/** El "+" verde para las pantallas donde crear es la acción principal del header (Grupos). */
export function BotonMas({ onPress, etiqueta }: { onPress: () => void; etiqueta: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{ backgroundColor: '#005228' }}
    >
      <Icono nombre="mas" tamano={16} color="#FFFFFF" />
    </Pressable>
  );
}

/** El avatar redondo que ocupa el hueco de la derecha cuando no hay nada más específico. */
export function BotonAvatar({ onPress }: { onPress: () => void }) {
  const col = useColores();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Perfil"
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{ backgroundColor: col.line }}
    >
      <Icono nombre="usuario" tamano={16} color={col.inkSuave} />
    </Pressable>
  );
}
