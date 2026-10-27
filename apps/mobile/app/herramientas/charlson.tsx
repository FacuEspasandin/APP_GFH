import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeCharlson } from '@/dominio/molde-charlson';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Índice de Comorbilidad de Charlson, sobre datos sueltos.
 *
 * Libre y sin red: criterios publicados, no cruza el catálogo. Sin
 * `calcular`: puntaje autosumado, diecinueve criterios.
 */
export default function Charlson() {
  const molde = moldeCharlson();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="alerta" titulo="Índice de Charlson">
        Comorbilidad y sobrevida a 10 años, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <Calculadora molde={molde} />
    </View>
  );
}
