import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularMeldParaMolde, moldeMeld } from '@/dominio/molde-meld';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * MELD-Na, sobre datos sueltos.
 *
 * Libre y sin red: es una fórmula publicada, no cruza el catálogo. Con
 * `calcular`: no es una suma de puntos, hay una fórmula real detrás —mismo
 * criterio que Clcr.
 */
export default function Meld() {
  const molde = moldeMeld();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="calculadora" titulo="MELD-Na">
        Prioridad de trasplante hepático, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularMeldParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
