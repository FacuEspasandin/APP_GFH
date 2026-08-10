import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AvisoNeutro, Boton, Pantalla } from '@/ui/kit';

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
      <Text className="text-grande font-fuerte text-ink">Acceso completo</Text>
      <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">
        Verificación clínica sobre tus propios pacientes, herramientas sin paciente y el catálogo
        completo.
      </Text>

      <View className="mt-5">
        <OpcionPlan
          titulo="Anual"
          precio="USD 44,99"
          detalle="USD 3,75 por mes · ahorrás 25%"
          activo={plan === 'anual'}
          onPress={() => setPlan('anual')}
        />
        <OpcionPlan
          titulo="Mensual"
          precio="USD 4,99"
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: activo }}
      className="mb-2.5 flex-row items-center rounded-card border bg-surface px-3.5 py-3.5"
      style={{ borderColor: activo ? '#1F5E4A' : '#DDE5E0', borderWidth: activo ? 2 : 1 }}
    >
      <View className="flex-1">
        <Text className="text-fila font-fuerte text-ink">{titulo}</Text>
        <Text className="font-sans mt-0.5 text-meta text-ink-suave">{detalle}</Text>
      </View>
      <Text className="text-fila font-fuerte text-primary">{precio}</Text>
    </Pressable>
  );
}
