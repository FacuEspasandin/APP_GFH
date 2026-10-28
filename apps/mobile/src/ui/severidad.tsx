import { Text, View } from 'react-native';

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
 */
export function EtiquetaEstado({ rango }: { rango: RangoGravedad }) {
  const color = colorEspina(rango);
  return (
    <View className="flex-none flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: color }}>
      <Text numberOfLines={1} className="text-eyebrow font-fuerte uppercase text-blanco">
        {RANGO_ETIQUETA[rango]}
      </Text>
    </View>
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
