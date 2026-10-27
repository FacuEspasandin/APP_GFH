import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeRcri } from '@/dominio/molde-rcri';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Índice de Riesgo Cardíaco Revisado (Lee), sobre datos sueltos.
 *
 * Libre y sin red: criterios publicados, no cruza el catálogo. Sin
 * `calcular`: puntaje autosumado.
 */
export default function Rcri() {
  const molde = moldeRcri();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="pulso" titulo="Índice de Riesgo Cardíaco">
        Riesgo cardíaco prequirúrgico (Lee), sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <Calculadora molde={molde} />
    </View>
  );
}
