import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularCalcioCorregidoParaMolde, moldeCalcioCorregido } from '@/dominio/molde-calcio-corregido';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Calcio corregido, sobre datos sueltos.
 *
 * Libre y sin red: aritmética directa, no cruza el catálogo. Sin categoría
 * de riesgo, mismo criterio que peso ideal.
 */
export default function CalcioCorregido() {
  const molde = moldeCalcioCorregido();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="calculadora" titulo="Calcio corregido">
        Corrección por albúmina, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularCalcioCorregidoParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
