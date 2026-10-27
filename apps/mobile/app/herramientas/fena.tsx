import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularFenaParaMolde, moldeFena } from '@/dominio/molde-fena';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * FENa, sobre datos sueltos.
 *
 * Libre y sin red: es una fórmula, no cruza el catálogo. Con `calcular`:
 * mismo criterio que Clcr, hay una fórmula real detrás.
 */
export default function Fena() {
  const molde = moldeFena();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="calculadora" titulo="FENa">
        Fracción excretada de sodio, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularFenaParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
