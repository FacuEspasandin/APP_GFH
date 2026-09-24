import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularMeldParaMolde, moldeMeld } from '@/dominio/molde-meld';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * MELD-Na, sobre datos sueltos.
 *
 * Libre y sin red: es una fórmula publicada, no cruza el catálogo. Con
 * `calcular`: no es una suma de puntos, hay una fórmula real detrás —mismo
 * criterio que Clcr.
 */
export default function Meld() {
  const molde = moldeMeld();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="calculadora" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">MELD-Na</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Prioridad de trasplante hepático, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularMeldParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
