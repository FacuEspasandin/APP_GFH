import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { moldeAbcd2 } from '@/dominio/molde-abcd2';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * ABCD2, sobre datos sueltos.
 *
 * Libre y sin red: criterios publicados, no cruza el catálogo. Sin
 * `calcular`: puntaje autosumado, mismo mecanismo que HAS-BLED.
 */
export default function Abcd2() {
  const molde = moldeAbcd2();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="glasgow" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">ABCD2</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Riesgo de ACV tras un AIT, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <Calculadora molde={molde} />
    </View>
  );
}
