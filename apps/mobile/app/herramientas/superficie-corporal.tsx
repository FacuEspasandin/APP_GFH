import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularSuperficieCorporalParaMolde, moldeSuperficieCorporal } from '@/dominio/molde-superficie-corporal';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * Superficie corporal (Mosteller), sobre datos sueltos.
 *
 * Libre y sin red, igual que HbA1c: fórmula publicada, no cruza el
 * catálogo. Sin categoría de riesgo — es un insumo para otro cálculo, no un
 * hallazgo en sí mismo.
 */
export default function SuperficieCorporal() {
  const molde = moldeSuperficieCorporal();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="superficie-corporal" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Superficie corporal</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Fórmula de Mosteller, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularSuperficieCorporalParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
