import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { moldeWells } from '@/dominio/molde-wells';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * Wells (TEP), sobre datos sueltos.
 *
 * Libre y sin red: son criterios publicados, no cruza el catálogo. Sin
 * `calcular`: el resultado es de tipo puntaje, autosumado de los puntos que
 * declara cada criterio (con pesos distintos, 1/1,5/3).
 */
export default function Wells() {
  const molde = moldeWells();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="pulso" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Wells · TEP</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Probabilidad clínica de tromboembolismo pulmonar, sobre datos sueltos — no cruza el
          catálogo.
        </Text>
      </View>

      <Calculadora molde={molde} />
    </View>
  );
}
