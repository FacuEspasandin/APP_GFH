import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularHba1cParaMolde, moldeHba1c } from '@/dominio/molde-hba1c';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * HbA1c → glucemia promedio estimada, sobre datos sueltos.
 *
 * Libre y sin red, igual que Clcr: fórmula publicada (ADAG, 2008), no cruza
 * el catálogo.
 */
export default function Hba1c() {
  const molde = moldeHba1c();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="calculadora" tamano={20} color="#005228" />
          <Text className="text-[26px] font-fuerte text-ink">HbA1c → glucemia promedio</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Estudio ADAG, sobre un dato suelto — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularHba1cParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
