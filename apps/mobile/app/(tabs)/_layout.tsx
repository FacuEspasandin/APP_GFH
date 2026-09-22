import { Tabs } from 'expo-router';

import { FondoHeader } from '@/ui/fondo-header';
import { coloresChrome, useTema } from '@/ui/tema';

/**
 * Las cuatro secciones de la app.
 *
 * El navegador de tabs sigue siendo el que las maneja, pero **no dibuja ninguna
 * barra**: la pinta `MenuInferior` en el layout raíz, para que siga visible al
 * entrar a un paciente o a una herramienta.
 *
 * `tabBar={() => null}` y no `tabBarStyle: display none`: ocultarla con estilo
 * dejaba los íconos de la barra pintándose arriba de la pantalla. Si el
 * componente no se monta, no hay nada que se escape.
 */
export default function LayoutTabs() {
  const { oscuro } = useTema();
  const c = coloresChrome(oscuro);

  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerBackground: () => <FondoHeader />,
        headerStyle: { backgroundColor: c.fondoHeader },
        headerTintColor: c.textoHeader,
        // Familia y no peso: con fuentes estáticas la negrita es otra familia.
        headerTitleStyle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Pacientes' }} />
      {/* Grupos ya no es una solapa propia: quedó absorbida por Pacientes
          (selector "Todos" / "Por grupo" dentro de la misma pantalla). La
          ruta sigue existiendo por si algo navega ahí directo, pero no
          cuelga del navbar. */}
      <Tabs.Screen name="grupos" options={{ href: null, title: 'Grupos' }} />
      {/* Con `title` explícito: sin él Expo Router cae al nombre del archivo y
          la barra decía «herramientas» en minúscula al lado de «Pacientes».
          Ya no lleva `href: null`: pasó a ser un tab normal, en 2da
          posición — el botón central ahora es el chat de IA. */}
      <Tabs.Screen name="herramientas" options={{ title: 'Herramientas' }} />
      <Tabs.Screen name="buscador" options={{ title: 'Buscador' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat con IA' }} />
    </Tabs>
  );
}
