import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularSuperficieCorporalParaMolde, moldeSuperficieCorporal } from '@/dominio/molde-superficie-corporal';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Superficie corporal (Mosteller), sobre datos sueltos.
 *
 * Libre y sin red, igual que HbA1c: fórmula publicada, no cruza el
 * catálogo. Sin categoría de riesgo — es un insumo para otro cálculo, no un
 * hallazgo en sí mismo.
 */
export default function SuperficieCorporal() {
  const molde = moldeSuperficieCorporal();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="superficie-corporal" titulo="Superficie corporal">
        Fórmula de Mosteller, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularSuperficieCorporalParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
