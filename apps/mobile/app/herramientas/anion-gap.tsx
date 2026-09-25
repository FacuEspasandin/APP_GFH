import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularAnionGapParaMolde, moldeAnionGap } from '@/dominio/molde-anion-gap';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * Anion Gap, sobre datos sueltos.
 *
 * Libre y sin red: es aritmética directa, no cruza el catálogo. Con
 * `calcular`: mismo criterio que Clcr.
 */
export default function AnionGap() {
  const molde = moldeAnionGap();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="alerta" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Anion Gap</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Brecha aniónica, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularAnionGapParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
