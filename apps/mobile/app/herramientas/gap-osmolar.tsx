import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularGapOsmolarParaMolde, moldeGapOsmolar } from '@/dominio/molde-gap-osmolar';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Gap osmolar, sobre datos sueltos.
 *
 * Libre y sin red: aritmética directa, no cruza el catálogo.
 */
export default function GapOsmolar() {
  const molde = moldeGapOsmolar();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="alerta" titulo="Gap osmolar">
        Sospecha de tóxico no medido, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularGapOsmolarParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
