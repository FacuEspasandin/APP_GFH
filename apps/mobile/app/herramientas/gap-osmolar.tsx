import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularGapOsmolarParaMolde, moldeGapOsmolar } from '@/dominio/molde-gap-osmolar';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * Gap osmolar, sobre datos sueltos.
 *
 * Libre y sin red: aritmética directa, no cruza el catálogo.
 */
export default function GapOsmolar() {
  const molde = moldeGapOsmolar();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="alerta" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Gap osmolar</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Sospecha de tóxico no medido, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularGapOsmolarParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
