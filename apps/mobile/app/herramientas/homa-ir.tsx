import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularHomaIrParaMolde, moldeHomaIr } from '@/dominio/molde-homa-ir';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * HOMA-IR, sobre datos sueltos.
 *
 * Libre y sin red: aritmética directa, no cruza el catálogo. Sin categoría
 * de riesgo — la fórmula es universal, pero el corte de interpretación
 * varía por población, así que no se fija uno propio.
 */
export default function HomaIr() {
  const molde = moldeHomaIr();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="calculadora" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">HOMA-IR</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Resistencia a la insulina, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularHomaIrParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
