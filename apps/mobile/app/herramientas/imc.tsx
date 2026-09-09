import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularImcParaMolde, moldeImc } from '@/dominio/molde-imc';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * Índice de masa corporal, sobre datos sueltos.
 *
 * Libre y sin red, igual que Clcr y Child-Pugh: es una clasificación
 * publicada de la OMS, no algo que cruce el catálogo.
 */
export default function Imc() {
  const molde = moldeImc();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="calculadora" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Índice de masa corporal</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Clasificación OMS, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularImcParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
