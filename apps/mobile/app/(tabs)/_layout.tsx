import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icono, type NombreIcono } from '@/ui/iconos';
import { FondoHeader } from '@/ui/fondo-header';
import { coloresChrome, useTema } from '@/ui/tema';

/**
 * Las 4 secciones de la app (documento funcional §5).
 *
 * Tab bar en `primary` sólido, íconos y texto en blanco, elevación nivel 2. El
 * resto de la superficie vive sobre `paper`/`surface`, nunca sobre primary.
 */
export default function LayoutTabs() {
  const { oscuro } = useTema();
  const c = coloresChrome(oscuro);

  // `color` llega como `ColorValue` desde SDK 57: puede ser un color opaco de
  // plataforma además de un string. Nuestros íconos sólo entienden strings, y
  // acá siempre lo es porque los tintes salen de `coloresChrome`.
  const tab = (nombre: NombreIcono) =>
    function IconoTab({ color }: { color: ColorValue }) {
      return <Icono nombre={nombre} tamano={21} color={color as string} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerBackground: () => <FondoHeader />,
          headerStyle: { backgroundColor: c.fondoHeader },
        headerTintColor: c.textoHeader,
        // Familia y no peso: con fuentes estáticas la negrita es otra familia.
          headerTitleStyle: { fontFamily: 'IBMPlexSans_700Bold', fontSize: 16 },
        // La barra la dibuja `MenuInferior` en el layout raíz, para que siga
        // visible al entrar a un paciente o a una herramienta. Ésta se oculta
        // en vez de borrarse: el navegador de tabs sigue siendo el que maneja
        // las 4 secciones, lo único que cambia es quién las pinta.
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: tab('casa') }} />
      <Tabs.Screen
        name="herramientas"
        options={{ title: 'Herramientas', tabBarIcon: tab('herramientas') }}
      />
      <Tabs.Screen name="buscador" options={{ title: 'Buscador', tabBarIcon: tab('buscar') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: tab('usuario') }} />
    </Tabs>
  );
}
