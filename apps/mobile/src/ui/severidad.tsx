import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { useAnimar } from './animacion';
import { MOVIMIENTO } from './tokens';
import {
  claveColorPorConteo,
  colorEspina,
  COLOR_CONTEO,
  RANGO_ETIQUETA,
  type RangoGravedad,
} from '@gfh/shared-types';

/**
 * Los componentes que hablan el lenguaje de severidad.
 *
 * Los colores se importan de `@gfh/shared-types` y se aplican por `style`, no
 * por clase de Tailwind: son información clínica, no tokens de tema, y no
 * cambian entre claro y oscuro. Es la misma definición que usa el backend para
 * ordenar — un solo módulo en todo el monorepo.
 */

/**
 * Badge de CANTIDAD, no de gravedad. Escala distinta a propósito: mide cuántos
 * hallazgos hay, no cuán graves son. El número siempre está además del color —
 * "naranja" no dice si son dos o siete.
 */
export function BadgeConteo({ n }: { n: number }) {
  const c = COLOR_CONTEO[claveColorPorConteo(n)];
  return (
    <View
      className="h-6 w-6 items-center justify-center rounded-chip border"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
    >
      <Text className="text-eyebrow font-fuerte" style={{ color: c.text }}>
        {n}
      </Text>
    </View>
  );
}

/**
 * La etiqueta de estado: una pastilla con la palabra escrita, el color nunca es
 * el único portador.
 *
 * Fondo sólido + texto blanco, SIN ícono — con 6 niveles, un ícono compartido
 * entre varios no aportaba nada que el color y la palabra no dijeran ya. El
 * fondo es el color de la escala clínica, sin aclarar: un tono suave de ámbar
 * no llega al contraste que pide un texto de 12 px.
 *
 * Es de una sola línea y no se achica ni se parte (`flex-none`): su lugar es
 * siempre la derecha del título, ver `TituloConEtiqueta` en `kit.tsx`.
 *
 * Cuando la gravedad CAMBIA con la pastilla ya en pantalla —se suspendió un
 * fármaco, se aceptó una alternativa, se refrescó— hace un pulso corto. Es lo
 * único que se mueve: el color no se anima nunca de un tono a otro, que
 * insinuaría una gravedad intermedia que no existe. Al aparecer por primera vez
 * no pulsa.
 */
export function EtiquetaEstado({ rango }: { rango: RangoGravedad }) {
  const color = colorEspina(rango);
  const anima = useAnimar();
  const escala = useRef(new Animated.Value(1)).current;
  const previo = useRef(rango);

  useEffect(() => {
    if (previo.current === rango) return;
    previo.current = rango;
    if (!anima) return;
    Animated.sequence([
      Animated.timing(escala, {
        toValue: 1.12,
        duration: MOVIMIENTO.pulso,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(escala, {
        toValue: 1,
        duration: MOVIMIENTO.pulso * 1.5,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [rango, anima, escala]);

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <View className="flex-none flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: color }}>
        <Text numberOfLines={1} className="text-eyebrow font-fuerte uppercase text-blanco">
          {RANGO_ETIQUETA[rango]}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Fondos pastel con que se tiñe una pieza según la gravedad.
 *
 * Viven acá, con los colores de severidad, y no en la paleta del tema: son la
 * misma información clínica y tampoco cambian entre claro y oscuro.
 */
const FONDO_POR_RANGO: Record<RangoGravedad, string> = {
  0: '#FEF2F2',
  1: '#FEF2F2',
  2: '#FFF7ED',
  3: '#FFFBEB',
  4: '#FFFBEB',
  5: 'transparent',
};

/** `null` = sin hallazgos. `transparent` = informativo: la pieza usa su propio fondo. */
export function fondoSeveridad(rango: RangoGravedad | null): string {
  return rango === null ? '#F0FDF4' : FONDO_POR_RANGO[rango];
}

/**
 * Colores propios de cada estado de una restricción (embarazo, lactancia,
 * renal, hepático). `ajustar` es el celeste de PROPIEDAD —tiene tabla de
 * ajuste—, no una gravedad. Pastel fijo: la grilla no se mezcla en oscuro.
 */
export const ESTADO_RESTRICCION = {
  fondoOk: '#ECFDF3',
  fondoEvitar: '#FEE7E7',
  /** El ámbar de la escala no llega a contraste como texto de 11 px: este sí. */
  frentePrecaucion: '#B45309',
  fondoPrecaucion: '#FEF3C7',
  frenteAjustar: '#075985',
  fondoAjustar: '#E0F2FE',
} as const;
