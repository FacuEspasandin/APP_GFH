import { Text, View } from 'react-native';

import {
  claveColorPorConteo,
  colorEspina,
  COLOR_CONTEO,
  COLOR_SEVERIDAD,
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

/** Barra de 4px en el borde izquierdo. La firma visual del sistema. */
export function Espina({ rango }: { rango: RangoGravedad | null }) {
  return <View style={{ width: 4, borderRadius: 2, backgroundColor: colorEspina(rango) }} />;
}

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

/** Pill con la etiqueta escrita: el color nunca es el único portador. */
export function ChipSeveridad({ rango }: { rango: RangoGravedad }) {
  const color = colorEspina(rango);
  return (
    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${color}22` }}>
      <Text className="text-eyebrow font-fuerte uppercase" style={{ color: oscurecer(color) }}>
        {RANGO_ETIQUETA[rango]}
      </Text>
    </View>
  );
}

/** El texto sobre el fondo translúcido necesita más contraste que el hex puro. */
function oscurecer(hex: string): string {
  const mapa: Record<string, string> = {
    [COLOR_SEVERIDAD.grave]: '#991B1B',
    [COLOR_SEVERIDAD.media]: '#92400E',
    [COLOR_SEVERIDAD.ok]: '#166534',
    [COLOR_SEVERIDAD.neutro]: '#44544C',
  };
  return mapa[hex] ?? hex;
}
