import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularFib4ParaMolde, moldeFib4 } from '@/dominio/molde-fib4';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

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
      <EncabezadoHerramienta icono="higado" titulo="FIB-4" tono="aviso">
        Fibrosis hepática, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularFib4ParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
