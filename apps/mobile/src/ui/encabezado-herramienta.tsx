import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Icono, type NombreIcono } from './iconos';
import { useColores } from './tema';

/**
 * El encabezado de una herramienta suelta: ícono, nombre y una línea que dice
 * qué calcula.
 *
 * Estaba copiado, tal cual, en las 34 pantallas de `app/herramientas`. Cualquier
 * ajuste de tamaño o de color obligaba a tocar las 34 — y de hecho ya habían
 * divergido (dos títulos en 26 px, uno en 22 y el resto en 28).
 *
 * El tono sólo cambia el color del ícono, que agrupa por familia: marca para las
 * calculadoras en general, `aviso` para las hepáticas, `peligro` para riesgo
 * cardiovascular. Nunca comunica gravedad: el resultado lo hace con severidad.
 */
export function EncabezadoHerramienta({
  icono,
  titulo,
  tono = 'marca',
  children,
}: {
  icono: NombreIcono;
  titulo: string;
  tono?: 'marca' | 'aviso' | 'peligro';
  /** Qué calcula y de dónde sale. */
  children: ReactNode;
}) {
  const col = useColores();
  const color = tono === 'aviso' ? col.aviso : tono === 'peligro' ? col.peligro : col.primary;

  return (
    <View className="px-margen pt-4">
      <View className="mb-1 flex-row items-center gap-2">
        <Icono nombre={icono} tamano={20} color={color} />
        <Text className="flex-1 text-titular font-extra text-ink">{titulo}</Text>
      </View>
      <Text className="mb-2 text-body leading-6 text-ink-suave">{children}</Text>
    </View>
  );
}
