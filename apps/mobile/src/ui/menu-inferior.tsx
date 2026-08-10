import { BlurView } from 'expo-blur';
import { useRouter, useSegments } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icono, type NombreIcono } from '@/ui/iconos';
import { coloresChrome, useTema } from '@/ui/tema';

/**
 * El menú de las 4 secciones, visible en toda la app.
 *
 * No es la barra de `Tabs`: esa sólo existe mientras la pantalla activa está
 * dentro del grupo `(tabs)`, y se pierde apenas se abre un paciente, una
 * herramienta o cualquier detalle — que es donde el médico pasa la mayor parte
 * del tiempo. Acá se dibuja en el layout raíz, por fuera del `Stack`, así que
 * está siempre.
 *
 * Va en el flujo del layout, no flotando encima: el `Stack` ocupa el alto que
 * queda y ninguna pantalla necesita reservar espacio ni acordarse de sumar
 * padding abajo.
 */

interface Destino {
  clave: string;
  ruta: string;
  titulo: string;
  icono: NombreIcono;
}

const DESTINOS: Destino[] = [
  { clave: 'index', ruta: '/(tabs)', titulo: 'Inicio', icono: 'casa' },
  { clave: 'herramientas', ruta: '/(tabs)/herramientas', titulo: 'Herramientas', icono: 'herramientas' },
  { clave: 'buscador', ruta: '/(tabs)/buscador', titulo: 'Buscador', icono: 'buscar' },
  { clave: 'perfil', ruta: '/(tabs)/perfil', titulo: 'Perfil', icono: 'usuario' },
];

/**
 * Pantallas sin menú: las de antes de entrar y las que bloquean la app a
 * propósito. Mostrar los accesos ahí sería ofrecer algo que no va a funcionar.
 *
 * El splash es el segmento vacío — `app/index.tsx`, antes de que se resuelva
 * si hay sesión.
 */
const SIN_MENU = new Set([
  '',
  'bienvenida',
  'login',
  'registro',
  'recuperar',
  'disclaimer',
  'suscripcion-vencida',
  'paywall',
]);

/**
 * Qué sección resaltar según dónde se esté.
 *
 * Los detalles heredan la sección de la que cuelgan: la ficha de un fármaco
 * pertenece al Buscador, un paciente y todo lo suyo a Inicio. Sin esto el menú
 * se apagaría entero apenas se entra a cualquier lado.
 */
function seccionActiva(segmentos: string[]): string {
  const primero = segmentos[0] ?? '';

  if (primero === '(tabs)') return segmentos[1] ?? 'index';
  if (primero === 'herramientas') return 'herramientas';
  if (primero === 'farmaco') return 'buscador';
  if (primero === 'perfil') return 'perfil';

  // Paciente, prescripción, grupo, crear-paciente, crear-grupo.
  return 'index';
}

export function MenuInferior() {
  const segmentos = useSegments() as string[];
  const router = useRouter();
  const { oscuro } = useTema();
  const insets = useSafeAreaInsets();
  const c = coloresChrome(oscuro);

  if (SIN_MENU.has(segmentos[0] ?? '')) return null;

  const activa = seccionActiva(segmentos);

  const ir = (destino: Destino) => {
    // `navigate` y no `push`: si la sección ya está en el historial vuelve a
    // ella en vez de apilar otra copia. Tocar "Inicio" estando en un paciente
    // tiene que cerrar el paciente, no dejarlo abierto debajo.
    router.navigate(destino.ruta as never);
  };

  return (
    <View
      style={{
        paddingBottom: insets.bottom,
        shadowColor: '#122A23',
        shadowOpacity: 0.16,
        shadowOffset: { width: 0, height: -3 },
        shadowRadius: 14,
        elevation: 14,
      }}
    >
      {/* Vidrio esmerilado con el color de marca ENCIMA, no en lugar de él.
          Un blur puro dejaría el texto blanco sobre lo que haya debajo y el
          contraste cambiaría con cada pantalla: en una lista clara los rótulos
          desaparecerían. Así el fondo sigue siendo primary —contraste
          garantizado— y el blur sólo aporta la profundidad. */}
      <BlurView
        intensity={40}
        tint={oscuro ? 'dark' : 'default'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: c.fondoHeader, opacity: 0.94 }]}
      />
      {/* Filo superior claro: el borde de luz que separa la barra del contenido
          sin necesidad de una línea dura. */}
      <View
        style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.14)' }}
      />

      <View className="flex-row" style={{ height: 62, paddingTop: 6, paddingBottom: 8 }}>
        {DESTINOS.map((destino) => {
          const activo = destino.clave === activa;
          const color = activo ? '#FFFFFF' : c.tabInactivo;

          return (
            <Pressable
              key={destino.clave}
              onPress={() => ir(destino)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={destino.titulo}
              className="flex-1 items-center justify-center"
            >
              {/* Pastilla detrás del ícono activo: marca la sección sin
                  depender sólo del brillo del blanco, que a 11px se pierde. */}
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 46,
                  height: 26,
                  backgroundColor: activo ? 'rgba(255,255,255,0.18)' : 'transparent',
                }}
              >
                <Icono nombre={destino.icono} tamano={20} color={color} />
              </View>
              {/* `font-medio` y no `fontWeight`: con fuentes estáticas el peso
                  es una familia distinta — ver tailwind.config.js. */}
              <Text className="font-medio" style={{ color, fontSize: 11, marginTop: 1 }}>
                {destino.titulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
