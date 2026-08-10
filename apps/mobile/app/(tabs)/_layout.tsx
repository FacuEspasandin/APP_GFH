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
        headerTitleStyle: { fontFamily: 'IBMPlexSans_700Bold', fontSize: 16 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Pacientes' }} />
      <Tabs.Screen name="grupos" options={{ title: 'Grupos' }} />
      <Tabs.Screen name="buscador" options={{ title: 'Buscador' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      {/* Sigue existiendo como ruta pero fuera de la barra: al menú de
          herramientas se llega por el botón central. */}
      <Tabs.Screen name="herramientas" options={{ href: null }} />
    </Tabs>
  );
}
