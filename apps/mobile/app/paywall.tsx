import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AvisoNeutro, Boton, Pantalla } from '@/ui/kit';
import { useColores } from '@/ui/tema';

/**
 * Paywall (1.7). Plan único, mensual o anual, sin prueba gratuita.
 *
 * El botón no cobra nada: la compra la hace StoreKit / Play Billing vía
 * RevenueCat, y el backend se entera SOLO por webhook (regla no negociable 6).
 * Hasta que el SDK esté integrado, la pantalla lo dice en vez de fingir.
 */
export default function Paywall() {
  const router = useRouter();
  const [plan, setPlan] = useState<'mensual' | 'anual'>('anual');

  return (
    <Pantalla>
      <Text className="text-grande font-fuerte text-ink">Todos tus pacientes</Text>
      <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">
        El plan gratis sigue a un paciente. Con la suscripción cargás todos los que atendés y cada
        uno se verifica solo.
      </Text>

      {/* Qué se lleva, en concreto. Un paywall que sólo muestra precios obliga
          al médico a recordar por qué llegó hasta acá. */}
      <View className="mt-4 rounded-card border border-line bg-surface px-3.5 py-3">
        {[
          'Pacientes ilimitados, con su cockpit completo',
          'Interacciones, ajuste renal y alertas, sobre todos',
          'Grupos para separar consultorio, CTI o guardia',
        ].map((linea) => (
          <View key={linea} className="flex-row items-start py-1">
            <Text className="mr-2 text-body font-fuerte text-primary">·</Text>
            <Text className="font-sans flex-1 text-meta leading-5 text-ink">{linea}</Text>
          </View>
        ))}
      </View>

      <View className="mt-5">
        <OpcionPlan
          titulo="Anual"
          precio="USD 69,99"
          detalle="USD 5,83 por mes · dos meses gratis"
          activo={plan === 'anual'}
          onPress={() => setPlan('anual')}
        />
        <OpcionPlan
          titulo="Mensual"
          precio="USD 6,99"
          detalle="Se renueva todos los meses"
          activo={plan === 'mensual'}
          onPress={() => setPlan('mensual')}
        />
      </View>

      <View className="mt-5">
        <Boton onPress={() => router.push('/disclaimer')}>Continuar</Boton>
      </View>

      <View className="mt-4">
        <AvisoNeutro>
          El cobro todavía no está conectado. La suscripción se gestiona desde la tienda del
          teléfono (App Store o Google Play) y el backend sólo la sincroniza desde ahí.
        </AvisoNeutro>
      </View>

      <Text className="font-sans mt-2 px-1 text-eyebrow leading-4 text-ink-suave">
        Sin prueba gratuita. Podés cancelar cuando quieras desde la tienda; el acceso sigue hasta el
        final del período pago.
      </Text>
    </Pantalla>
  );
}

function OpcionPlan({
  titulo,
  precio,
  detalle,
  activo,
  onPress,
}: {
  titulo: string;
  precio: string;
  detalle: string;
  activo: boolean;
  onPress: () => void;
}) {
  const col = useColores();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: activo }}
      className="mb-2.5 flex-row items-center rounded-card border bg-surface px-3.5 py-3.5"
      style={{ borderColor: activo ? col.primary : col.line, borderWidth: activo ? 2 : 1 }}
    >
      <View className="flex-1">
        <Text className="text-fila font-fuerte text-ink">{titulo}</Text>
        <Text className="font-sans mt-0.5 text-meta text-ink-suave">{detalle}</Text>
      </View>
      <Text className="text-fila font-fuerte text-primary">{precio}</Text>
    </Pressable>
  );
}
