import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { moldeNihss } from '@/dominio/molde-nihss';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * NIHSS, sobre datos sueltos.
 *
 * Libre y sin red: criterios publicados, no cruza el catálogo. Es la
 * calculadora más larga (15 ítems) — la cascada existe justo para esto, para
 * que quince criterios no sean una sola pantalla de scroll infinito.
 */
export default function Nihss() {
  const molde = moldeNihss();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="glasgow" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">NIHSS</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Severidad de ACV, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <Calculadora molde={molde} />
    </View>
  );
}
