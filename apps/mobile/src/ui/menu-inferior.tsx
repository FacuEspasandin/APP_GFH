import { useRouter, useSegments } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
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
        backgroundColor: c.fondoHeader,
        paddingBottom: insets.bottom,
        shadowColor: '#122A23',
        shadowOpacity: 0.14,
        shadowOffset: { width: 0, height: -2 },
        shadowRadius: 10,
        elevation: 12,
      }}
    >
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
              <Icono nombre={destino.icono} tamano={21} color={color} />
              <Text className="font-sans" style={{ color, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                {destino.titulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
