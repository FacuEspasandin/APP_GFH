import { Pressable, Text, View } from 'react-native';

import { hapticaSeleccion } from '@/ui/haptica';
import { useColores } from '@/ui/tema';

/**
 * Pestañas con subrayado, pegadas al header.
 *
 * No es un segmented control con píldoras: ese ya existe como `Chip` y compite
 * con el verde del header, que está justo arriba. El subrayado marca la
 * sección activa sin pintar un bloque de color a dos centímetros de otro.
 *
 * El contador vive en la pestaña a propósito. Saber que hay 31 interacciones
 * antes de entrar cambia si entrás; que haya 2, también.
 */
export interface Pestana<T extends string> {
  clave: T;
  titulo: string;
  /** Se muestra al lado del título. `null` o `0` no dibuja nada: una pestaña
   *  que dice "0" invita a tocarla para no encontrar nada. */
  conteo?: number | null;
}

export function Pestanas<T extends string>({
  pestanas,
  activa,
  onCambiar,
}: {
  pestanas: readonly Pestana<T>[];
  activa: T;
  onCambiar: (clave: T) => void;
}) {
  const col = useColores();

  return (
    <View className="flex-row border-b border-line bg-surface">
      {pestanas.map((p) => {
        const esActiva = p.clave === activa;
        return (
          <Pressable
            key={p.clave}
            onPress={() => {
              hapticaSeleccion();
              onCambiar(p.clave);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: esActiva }}
            className="flex-1 flex-row items-center justify-center px-1.5 pb-2.5 pt-3"
            style={{
              borderBottomWidth: 2,
              borderBottomColor: esActiva ? col.primary : 'transparent',
            }}
          >
            <Text
              className="font-medio"
              numberOfLines={1}
              style={{ color: esActiva ? col.primary : col.inkSuave, fontSize: 13 }}
            >
              {p.titulo}
            </Text>
            {p.conteo ? (
              <View
                className="ml-1.5 rounded-full px-1.5"
                style={{ backgroundColor: esActiva ? col.primaryLight : col.line }}
              >
                <Text
                  className="font-mono-fuerte"
                  style={{
                    fontSize: 11,
                    color: esActiva ? col.primary : col.inkSuave,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {p.conteo}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
