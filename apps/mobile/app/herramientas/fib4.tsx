import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularFib4ParaMolde, moldeFib4 } from '@/dominio/molde-fib4';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * FIB-4, sobre datos sueltos.
 *
 * Libre y sin red: es aritmética directa, no cruza el catálogo. Con
 * `calcular`: mismo criterio que Clcr/MELD.
 */
export default function Fib4() {
  const molde = moldeFib4();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="higado" tamano={20} color="#B45309" />
          <Text className="text-[28px] font-fuerte text-ink">FIB-4</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Fibrosis hepática, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularFib4ParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
