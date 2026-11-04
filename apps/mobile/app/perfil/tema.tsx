import { Pressable, Text, View } from 'react-native';

import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Icono, type NombreIcono } from '@/ui/iconos';
import { Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { hapticaSeleccion } from '@/ui/haptica';
import { useColores, useTema, type Tema } from '@/ui/tema';

const OPCIONES: { valor: Tema; etiqueta: string; detalle?: string; icono: NombreIcono }[] = [
  { valor: 'CLARO', etiqueta: 'Claro', icono: 'sol' },
  { valor: 'OSCURO', etiqueta: 'Oscuro', icono: 'luna' },
  { valor: 'SISTEMA', etiqueta: 'Sistema', detalle: 'Sigue la configuración de tu teléfono', icono: 'dispositivo' },
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
          Elegí el tema que prefieras.
        </Text>

        <Superficie elevacion="plana" className="p-2">
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
                accessibilityLabel={o.detalle ? `${o.etiqueta}. ${o.detalle}` : o.etiqueta}
                className="flex-row items-center rounded-chip px-3 py-3"
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: col.line } : undefined}
              >
                <View
                  className="mr-3 items-center justify-center rounded-chip"
                  style={{ width: 36, height: 36, backgroundColor: col.primaryLight }}
                >
                  <Icono nombre={o.icono} tamano={18} color={col.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-body font-medio text-ink">{o.etiqueta}</Text>
                  {o.detalle ? (
                    <Text className="font-sans mt-0.5 text-meta text-ink-suave">{o.detalle}</Text>
                  ) : null}
                </View>
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
