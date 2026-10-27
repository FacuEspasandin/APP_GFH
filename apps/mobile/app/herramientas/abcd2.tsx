import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeAbcd2 } from '@/dominio/molde-abcd2';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * ABCD2, sobre datos sueltos.
 *
 * Libre y sin red: criterios publicados, no cruza el catálogo. Sin
 * `calcular`: puntaje autosumado, mismo mecanismo que HAS-BLED.
 */
export default function Abcd2() {
  const molde = moldeAbcd2();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="glasgow" titulo="ABCD2">
        Riesgo de ACV tras un AIT, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <Calculadora molde={molde} />
    </View>
  );
}
