import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularImcParaMolde, moldeImc } from '@/dominio/molde-imc';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

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
      <EncabezadoHerramienta icono="calculadora" titulo="Índice de masa corporal">
        Clasificación OMS, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularImcParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
