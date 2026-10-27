import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularPesoIdealParaMolde, moldePesoIdeal } from '@/dominio/molde-peso-ideal';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Peso ideal y ajustado (Devine), sobre datos sueltos.
 *
 * Libre y sin red, mismo criterio que superficie corporal: insumo para
 * dosificar, sin categoría de riesgo.
 */
export default function PesoIdeal() {
  const molde = moldePesoIdeal();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="calculadora" titulo="Peso ideal">
        Fórmula de Devine, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularPesoIdealParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
