import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularHomaIrParaMolde, moldeHomaIr } from '@/dominio/molde-homa-ir';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * HOMA-IR, sobre datos sueltos.
 *
 * Libre y sin red: aritmética directa, no cruza el catálogo. Sin categoría
 * de riesgo — la fórmula es universal, pero el corte de interpretación
 * varía por población, así que no se fija uno propio.
 */
export default function HomaIr() {
  const molde = moldeHomaIr();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="calculadora" titulo="HOMA-IR">
        Resistencia a la insulina, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularHomaIrParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
