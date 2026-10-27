import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularSodioCorregidoParaMolde, moldeSodioCorregido } from '@/dominio/molde-sodio-corregido';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Sodio corregido, sobre datos sueltos.
 *
 * Libre y sin red: aritmética directa, no cruza el catálogo. Sin categoría
 * de riesgo, mismo criterio que calcio corregido.
 */
export default function SodioCorregido() {
  const molde = moldeSodioCorregido();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="calculadora" titulo="Sodio corregido">
        Corrección por hiperglucemia, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularSodioCorregidoParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
