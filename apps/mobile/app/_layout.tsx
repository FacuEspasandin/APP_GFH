import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { BotonVolverHeader } from '@/ui/boton-volver';
import { useFuentes } from '@/ui/fuentes';
import { MenuInferior } from '@/ui/menu-inferior';
import { activarPantallaCompletaWeb } from '@/ui/pantalla-completa-web';
import { FondoHeader } from '@/ui/fondo-header';
import { coloresChrome, ProveedorTema, useTema } from '@/ui/tema';

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
    <QueryClientProvider client={cliente}>
      <ProveedorTema>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Navegacion />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ProveedorTema>
    </QueryClientProvider>
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
    registrarManejadorLimitePlan(() => {
      router.push('/paywall');
    });
  }, [router]);

  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerBackground: () => <FondoHeader />,
          headerStyle: { backgroundColor: c.fondoHeader },
          headerTintColor: c.textoHeader,
          // Familia y no peso: con fuentes estáticas la negrita es otra familia.
          headerTitleStyle: { fontFamily: 'IBMPlexSans_700Bold', fontSize: 16 },
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
        <Stack.Screen
          name="registro"
          options={{ title: 'Crear cuenta', headerLeft: () => <BotonVolverHeader /> }}
        />
        <Stack.Screen name="recuperar" options={{ title: 'Recuperar contraseña' }} />
        <Stack.Screen name="paywall" options={{ title: 'Suscripción' }} />
        <Stack.Screen name="disclaimer" options={{ headerShown: false }} />
        <Stack.Screen name="suscripcion-vencida" options={{ headerShown: false }} />

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen name="crear-paciente" options={{ title: 'Nuevo paciente' }} />
        <Stack.Screen name="crear-grupo" options={{ title: 'Nuevo grupo' }} />
        <Stack.Screen name="grupo/[id]" options={{ title: 'Grupo' }} />
        <Stack.Screen name="grupo/[id]/editar" options={{ title: 'Editar grupo' }} />

        <Stack.Screen name="paciente/[id]" options={{ title: 'Paciente' }} />
        <Stack.Screen name="paciente/[id]/editar" options={{ title: 'Editar paciente' }} />
        <Stack.Screen name="paciente/[id]/agregar-farmaco" options={{ title: 'Agregar fármaco' }} />
        <Stack.Screen name="paciente/[id]/agregar-condicion" options={{ title: 'Agregar condición' }} />
        <Stack.Screen name="paciente/[id]/agregar-alergia" options={{ title: 'Agregar alergia' }} />
        <Stack.Screen name="paciente/[id]/condiciones-alergias" options={{ title: 'Condiciones y alergias' }} />
        <Stack.Screen name="paciente/[id]/datos-renales" options={{ title: 'Función renal' }} />
        <Stack.Screen name="paciente/[id]/datos-hepaticos" options={{ title: 'Función hepática' }} />
        <Stack.Screen name="paciente/[id]/embarazo-lactancia" options={{ title: 'Embarazo y lactancia' }} />
        <Stack.Screen name="paciente/[id]/alternativas" options={{ title: "Alternativas" }} />
        <Stack.Screen name="paciente/[id]/aceptar-alternativa" options={{ title: "Reemplazar fármaco" }} />
        <Stack.Screen name="paciente/[id]/cargar-tratamiento" options={{ title: 'Cargar tratamiento' }} />
        <Stack.Screen name="paciente/[id]/hallazgos" options={{ title: 'Hallazgo' }} />
        <Stack.Screen name="prescripcion/[id]" options={{ title: 'Fármaco' }} />

        <Stack.Screen name="herramientas/interacciones" options={{ title: 'Interacciones' }} />
        <Stack.Screen name="herramientas/condicion-alergia" options={{ title: 'Condición y alergia' }} />
        <Stack.Screen name="herramientas/renal" options={{ title: 'Ajuste renal' }} />
        <Stack.Screen name="herramientas/hepatico" options={{ title: 'Ajuste hepático' }} />

        <Stack.Screen name="farmaco/[id]" options={{ title: 'Ficha' }} />

        <Stack.Screen name="perfil/cuenta" options={{ title: 'Datos personales' }} />
        <Stack.Screen name="perfil/password" options={{ title: 'Contraseña' }} />
        <Stack.Screen name="perfil/sesiones" options={{ title: 'Sesiones activas' }} />
        <Stack.Screen name="perfil/tema" options={{ title: 'Tema' }} />
        <Stack.Screen name="perfil/notificaciones" options={{ title: 'Notificaciones' }} />
        <Stack.Screen name="perfil/umbral" options={{ title: 'Umbral de adulto mayor' }} />
        <Stack.Screen name="perfil/suscripcion" options={{ title: 'Suscripción' }} />
        <Stack.Screen name="perfil/ayuda" options={{ title: 'Ayuda y soporte' }} />
        <Stack.Screen name="perfil/legales" options={{ title: 'Términos y privacidad' }} />
        <Stack.Screen name="perfil/acerca" options={{ title: 'Acerca de GFH' }} />
        <Stack.Screen name="perfil/eliminar-cuenta" options={{ title: 'Eliminar cuenta' }} />
      </Stack>

      {/* Fuera del Stack a propósito: así sobrevive a cualquier navegación. */}
      <MenuInferior />
    </View>
  );
}
