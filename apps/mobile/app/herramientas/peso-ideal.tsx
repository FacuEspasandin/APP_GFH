import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularPesoIdealParaMolde, moldePesoIdeal } from '@/dominio/molde-peso-ideal';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * Peso ideal y ajustado (Devine), sobre datos sueltos.
 *
 * Libre y sin red, mismo criterio que superficie corporal: insumo para
 * dosificar, sin categoría de riesgo.
 */
export default function PesoIdeal() {
  const molde = moldePesoIdeal();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="calculadora" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Peso ideal</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Fórmula de Devine, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularPesoIdealParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
