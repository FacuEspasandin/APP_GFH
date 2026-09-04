import { Text, View } from 'react-native';

import { Icono, type NombreIcono } from '@/ui/iconos';
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

/** Un ícono por rango: los dos peores comparten "alerta", el informativo es otro. */
const ICONO_RANGO: Record<RangoGravedad, NombreIcono> = {
  0: 'alerta',
  1: 'alerta',
  2: 'alerta',
  3: 'info',
};

/**
 * Pill con la etiqueta escrita: el color nunca es el único portador.
 *
 * Fondo sólido + texto blanco — la misma pastilla que ya usan la fila de
 * paciente (Pacientes, Detalle del Grupo) y "Lo más grave" del cockpit. Antes
 * esta versión oscurecía el texto en vez de ponerlo blanco, y quedaba como la
 * única pastilla de severidad distinta de las demás.
 */
export function ChipSeveridad({ rango }: { rango: RangoGravedad }) {
  const color = colorEspina(rango);
  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
      style={{ backgroundColor: color }}
    >
      <Icono nombre={ICONO_RANGO[rango]} tamano={12} color="#FFFFFF" />
      <Text className="text-eyebrow font-fuerte uppercase text-white">
        {RANGO_ETIQUETA[rango]}
      </Text>
    </View>
  );
}
