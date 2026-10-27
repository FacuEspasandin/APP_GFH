import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { calcularMaddreyParaMolde, moldeMaddrey } from '@/dominio/molde-maddrey';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Función discriminante de Maddrey, sobre datos sueltos.
 *
 * Libre y sin red: es aritmética directa, no cruza el catálogo. Con
 * `calcular`: mismo criterio que Clcr/MELD.
 */
export default function Maddrey() {
  const molde = moldeMaddrey();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="higado" titulo="Maddrey" tono="aviso">
        Severidad de hepatitis alcohólica, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={molde} calcular={calcularMaddreyParaMolde} />
      </KeyboardAvoidingView>
    </View>
  );
}
