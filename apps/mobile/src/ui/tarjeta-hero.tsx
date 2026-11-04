import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { estiloSombra } from './superficie';
import { useColores, useTema } from './tema';
import { PALETA } from './tokens';

/**
 * La tarjeta protagonista: el dato que importa de la pantalla (resumen del
 * paciente, resultado de una calculadora). **Una por pantalla como máximo**; si
 * hay dos, ninguna es protagonista.
 *
 * Claro: degradé de `primary` a `primaryHover`, texto en `onPrimary`.
 * Oscuro: `surfaceAlt` con un filo de `primary` arriba. El verde de marca
 * aclarado que necesita el texto no funciona como fondo de una tarjeta grande.
 *
 * El texto de adentro no es `text-ink`: tiene que seguir a la tarjeta. Usar
 * `useColoresHero()` y pasarlo por `style`.
 */
export function TarjetaHero({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { oscuro } = useTema();
  const col = useColores();

  if (oscuro) {
    return (
      <View
        className={`overflow-hidden rounded-hero ${className}`}
        style={[
          estiloSombra('media'),
          {
            backgroundColor: col.surfaceAlt,
            borderWidth: 1,
            borderColor: PALETA.oscuro.line,
            borderTopWidth: 3,
            borderTopColor: col.primary,
          },
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View className={`overflow-hidden rounded-hero ${className}`} style={estiloSombra('media')}>
      <LinearGradient
        colors={[col.primary, col.primaryHover]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

/**
 * Los colores del texto sobre `TarjetaHero`: cambian con el tema porque el
 * fondo cambia. `suave` es para apoyo (rótulos, unidades); en claro es el mismo
 * `onPrimary` con `opacidadSuave` aplicada al `Text`, para no inventar un color.
 */
export function useColoresHero() {
  const { oscuro } = useTema();
  const col = useColores();
  return oscuro
    ? { texto: col.ink, suave: col.inkSuave, opacidadSuave: 1 }
    : { texto: col.onPrimary, suave: col.onPrimary, opacidadSuave: 0.85 };
}
