import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularHba1cParaMolde, moldeHba1c } from '@/dominio/molde-hba1c';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

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
      <EncabezadoHerramienta icono="calculadora" titulo="HbA1c → glucemia promedio">
        Estudio ADAG, sobre un dato suelto — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularHba1cParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
