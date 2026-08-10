import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { coloresChrome, useTema } from './tema';

/**
 * Fondo del header de navegación.
 *
 * Un degradado muy corto en lugar del verde plano: el color de marca sólido
 * sobre toda la barra se lee pesado, como un bloque pegado arriba. La
 * diferencia entre los dos extremos es mínima a propósito — se percibe como
 * profundidad, no como un degradado.
 *
 * Se usa vía `headerBackground` del Stack, que dibuja detrás del título y de
 * los botones sin tocar su disposición.
 */
export function FondoHeader() {
  const { oscuro } = useTema();
  const c = coloresChrome(oscuro);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={oscuro ? ['#1A2C25', '#101B17'] : ['#2A6E58', '#1B5342']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      />
      {/* Filo inferior: separa del contenido sin una línea dura. */}
      <View
        style={{
          height: 1,
          backgroundColor: oscuro ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.10)',
        }}
      />
      {/* Referencia al color base para que nadie lo pierda de vista si retoca
          el degradado: los extremos tienen que rodear a `c.fondoHeader`. */}
      <View style={{ display: 'none', backgroundColor: c.fondoHeader }} />
    </View>
  );
}
