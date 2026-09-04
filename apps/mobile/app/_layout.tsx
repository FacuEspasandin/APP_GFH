import '../global.css';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  registrarManejadorLimitePlan,
  registrarManejadorSuscripcionVencida,
} from '@/api/cliente';
import { iniciarReporteDeErrores } from '@/api/errores';
import { MS_MAXIMO, opcionesDeshidratado, persistidor } from '@/api/persistencia';
import { rutaPaywall } from '@/dominio/plan-gratis';
import { ProveedorAviso } from '@/ui/aviso';
import { useFuentes } from '@/ui/fuentes';
import { MenuInferior } from '@/ui/menu-inferior';
import { activarPantallaCompletaWeb } from '@/ui/pantalla-completa-web';
import { coloresChrome, ProveedorTema, useTema } from '@/ui/tema';

/* Antes de que se monte nada: un error en el primer render también tiene que
   reportarse. Sin DSN configurado no hace nada — ver `api/errores.ts`. */
iniciarReporteDeErrores();

export default function LayoutRaiz() {
  useEffect(() => activarPantallaCompletaWeb(), []);

  const [cliente] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // staleTime 0: no tiene sentido servir una versión vieja de un dato
          // clínico. El cockpit se recalcula entero en el backend.
          queries: { staleTime: 0, retry: 1, refetchOnWindowFocus: true },
        },
      }),
  );

  const fuentesListas = useFuentes();

  // Nada se pinta hasta que IBM Plex esté cargada. Renderizar antes muestra la
  // pantalla en la fuente del sistema y la reemplaza medio segundo después: el
  // salto de layout se nota más que la espera.
  if (!fuentesListas) return null;

  return (
    /*
     * Persistente, pero sólo el catálogo: ver `api/persistencia.ts`. Lo que
     * cuelga de un paciente sigue viviendo en memoria, porque un cockpit
     * servido de disco sería una verificación de ayer con cara de hoy.
     */
    <PersistQueryClientProvider
      client={cliente}
      persistOptions={{
        persister: persistidor,
        maxAge: MS_MAXIMO,
        dehydrateOptions: opcionesDeshidratado,
      }}
    >
      <ProveedorTema>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {/*
             * Sin `KeyboardProvider` de `react-native-keyboard-controller` a
             * propósito — tercera vuelta con esa librería, y la saco.
             *
             * Historia: un recorte del header se le atribuyó una vez y no era
             * suya (era `headerBackground` del native-stack), así que se
             * reinstaló para que Android tuviera el mismo comportamiento que
             * iOS. Pero las 12 pantallas que la usan se quedaron con
             * `Platform.OS === 'ios' ? 'padding' : undefined` de antes, así
             * que en Android nunca hizo nada — el segundo intento tampoco se
             * completó. El 4/9/2026, con la app corriendo en el emulador de
             * Android Studio (AVD con `hw.keyboard=no`, correctamente
             * configurado), tocar un campo de texto a veces no desplegaba el
             * teclado, en varias pantallas sin patrón de una sola. Es la
             * única pieza de código nativo que sigue tocando activamente el
             * foco/teclado en toda la app, corriendo sobre Reanimated 4 con
             * la New Architecture — una combinación que la librería declara
             * compatible sólo de forma laxa (`>=3.0.0`).
             *
             * Se reemplazó por el `KeyboardAvoidingView` de React Native en
             * las 12 pantallas — mismo `behavior` que ya tenían, así que en
             * Android es un cambio neutro. Se reabre si alguien puede
             * verificar en un dispositivo que el problema no era ésta.
             */}
            {/* Adentro del área segura: el aviso se posiciona contra el borde
                de arriba y necesita el inset del notch. */}
            <ProveedorAviso>
              <Navegacion />
            </ProveedorAviso>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ProveedorTema>
    </PersistQueryClientProvider>
  );
}

function Navegacion() {
  const { oscuro } = useTema();
  const router = useRouter();
  const c = coloresChrome(oscuro);

  // La suscripción vencida bloquea toda la app, así que se maneja una vez acá
  // y no pantalla por pantalla. El cliente HTTP lo dispara al recibir el 403.
  useEffect(() => {
    registrarManejadorSuscripcionVencida(() => {
      router.replace('/suscripcion-vencida');
    });

    // `push` y no `replace`: el médico estaba haciendo algo y tiene que poder
    // volver a eso cerrando el paywall. Perder la pantalla donde estaba lo
    // castiga por haber tocado una función paga.
    registrarManejadorLimitePlan((motivo) => {
      router.push(rutaPaywall(motivo) as never);
    });
  }, [router]);

  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          // SIN `headerBackground`. Ponerlo hace que el native-stack dibuje
          // la pantalla desde y=0 de la ventana y el header encima: los
          // primeros ~108px de CADA pantalla con header quedaban tapados, y no
          // se llegaba a ellos ni scrolleando porque el ScrollView creía estar
          // en el tope. Costó una tapa de sección entera antes de encontrarlo.
          //
          // Lo que se pierde es un degradado que el propio comentario original
          // describía como imperceptible. El verde sigue saliendo de
          // `headerStyle`. Si alguna vez se quiere el degradado de vuelta, hay
          // que compensar el offset con `useHeaderHeight()` en TODAS las
          // pantallas — no sólo en `Pantalla`— o el recorte vuelve.
          headerStyle: { backgroundColor: c.fondoHeader },
          headerTintColor: c.textoHeader,
          // Familia y no peso: con fuentes estáticas la negrita es otra familia.
          headerTitleStyle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
          headerBackTitle: 'Atrás',
          contentStyle: { backgroundColor: c.fondoPantalla },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        {/* `headerLeft` explícito y no la flecha nativa: a Registro se puede
            llegar sin nada atrás —desde un enlace, o tras cerrar sesión— y en
            ese caso el Stack no dibuja ninguna, dejando la pantalla sin
            salida. Éste siempre vuelve a Bienvenida. */}
        {/* Cabecera propia (rediseño de Figma): blanca, con el título de la
            pantalla en vez de la marca — ver el header inline en `registro.tsx`. */}
        <Stack.Screen name="registro" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="recuperar" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño de Figma): blanca, "GFH" chico + cerrar —
            ver el header inline en `paywall.tsx`. */}
        <Stack.Screen name="paywall" options={{ headerShown: false }} />
        <Stack.Screen name="disclaimer" options={{ headerShown: false }} />
        <Stack.Screen name="suscripcion-vencida" options={{ headerShown: false }} />

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen name="crear-paciente" options={{ headerShown: false }} />
        <Stack.Screen name="crear-grupo" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño de Figma) — ver `EncabezadoApp`. */}
        <Stack.Screen name="grupo/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="grupo/[id]/editar" options={{ headerShown: false }} />

        {/* Cabecera propia (rediseño de Figma) en vez del header nativo — ver
            `EncabezadoApp` en `src/ui/encabezado-app.tsx`. */}
        <Stack.Screen name="paciente/[id]" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoApp`. */}
        <Stack.Screen name="paciente/[id]/editar" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="paciente/[id]/agregar-farmaco" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="paciente/[id]/agregar-condicion" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="paciente/[id]/agregar-alergia" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="paciente/[id]/condiciones-alergias" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="paciente/[id]/datos-renales" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="paciente/[id]/datos-hepaticos" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="paciente/[id]/embarazo-lactancia" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño de Figma) — ver `EncabezadoApp`. Quedó
            pendiente desde que se portó el contenido; recién se corrigió en
            la auditoría de coherencia. */}
        <Stack.Screen name="paciente/[id]/historial" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`/`ConsultaPlegada`. */}
        <Stack.Screen name="paciente/[id]/alternativas" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="paciente/[id]/elegir-producto-alternativa" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="paciente/[id]/aceptar-alternativa" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño de Figma): blanca, cerrar + título — ver
            el header inline en `cargar-tratamiento.tsx`. Es un flujo lineal,
            por eso el frame de Figma la llama "Hidden Nav Shell": tampoco
            lleva la barra inferior (ver `SIN_MENU_SUBRUTA` en `menu-inferior.tsx`). */}
        <Stack.Screen name="paciente/[id]/cargar-tratamiento" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño de Figma) — ver `EncabezadoApp`. */}
        <Stack.Screen name="paciente/[id]/hallazgos" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño de Figma) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="prescripcion/[id]" options={{ headerShown: false }} />

        <Stack.Screen name="herramientas/interacciones" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoApp`. */}
        <Stack.Screen name="herramientas/condicion-alergia" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoApp`. */}
        <Stack.Screen name="herramientas/renal" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoApp`. */}
        <Stack.Screen name="herramientas/hepatico" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoApp`. */}
        <Stack.Screen name="herramientas/ajuste-hepatico" options={{ headerShown: false }} />

        <Stack.Screen name="farmaco/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="farmaco/[id]/renal" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoApp`. */}
        <Stack.Screen name="farmaco/[id]/hepatico" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoApp`. */}
        <Stack.Screen name="farmaco/[id]/embarazo" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoApp`. */}
        <Stack.Screen name="farmaco/[id]/lactancia" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoApp`. */}
        <Stack.Screen name="farmaco/[id]/interacciones" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="farmaco/[id]/monografia/[seccion]" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoApp`. OJO: acá el `id`
            de la ruta es un PrincipioActivo.id, no un ProductoComercial —
            ver el comentario en similares.tsx. */}
        <Stack.Screen name="farmaco/[id]/similares" options={{ headerShown: false }} />

        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="perfil/cuenta" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="perfil/password" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="perfil/sesiones" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="perfil/tema" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="perfil/notificaciones" options={{ headerShown: false }} />
        <Stack.Screen name="perfil/umbral" options={{ headerShown: false }} />
        <Stack.Screen name="perfil/bloqueo" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="perfil/suscripcion" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="perfil/ayuda" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="perfil/legales" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="perfil/acerca" options={{ headerShown: false }} />
        {/* Cabecera propia (rediseño) — ver `EncabezadoConTitulo`. */}
        <Stack.Screen name="perfil/eliminar-cuenta" options={{ headerShown: false }} />
      </Stack>

      {/* Fuera del Stack a propósito: así sobrevive a cualquier navegación. */}
      <MenuInferior />
    </View>
  );
}
