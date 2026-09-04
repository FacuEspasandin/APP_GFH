import { Pressable, Text, View } from 'react-native';

import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { hapticaSeleccion } from '@/ui/haptica';
import { useColores, useTema, type Tema } from '@/ui/tema';

const OPCIONES: { valor: Tema; etiqueta: string }[] = [
  { valor: 'CLARO', etiqueta: 'Claro' },
  { valor: 'OSCURO', etiqueta: 'Oscuro' },
  { valor: 'SISTEMA', etiqueta: 'Sistema' },
];

/**
 * Tema (6.4).
 *
 * Salió de "Tema y notificaciones", que era un cajón con tres cosas sin
 * relación entre sí. Acá cada preferencia tiene su pantalla y su explicación.
 */
export default function TemaPantalla() {
  const col = useColores();
  const { tema, cambiar } = useTema();

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Apariencia" />
      <Pantalla>
        <Text className="mb-4 font-sans text-meta leading-5 text-ink-suave">
          Elegí el tema que prefieras. "Sistema" sigue la configuración de tu teléfono.
        </Text>

        <Superficie elevacion="plana" className="border p-2" style={{ borderColor: col.line }}>
          {OPCIONES.map((o, i) => {
            const activo = tema === o.valor;
            return (
              <Pressable
                key={o.valor}
                onPress={() => {
                  hapticaSeleccion();
                  cambiar(o.valor);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
                className="flex-row items-center justify-between rounded-input px-3 py-3.5"
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: col.line } : undefined}
              >
                <Text className="text-body font-medio text-ink">{o.etiqueta}</Text>
                <View
                  className="items-center justify-center rounded-full border"
                  style={{
                    width: 20,
                    height: 20,
                    borderColor: activo ? col.primary : col.tenue,
                    borderWidth: activo ? 6 : 1.5,
                  }}
                />
              </Pressable>
            );
          })}
        </Superficie>
      </Pantalla>
    </View>
  );
}
