import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeWells } from '@/dominio/molde-wells';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Wells (TEP), sobre datos sueltos.
 *
 * Libre y sin red: son criterios publicados, no cruza el catálogo. Sin
 * `calcular`: el resultado es de tipo puntaje, autosumado de los puntos que
 * declara cada criterio (con pesos distintos, 1/1,5/3).
 */
export default function Wells() {
  const molde = moldeWells();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="pulso" titulo="Wells · TEP">
        Probabilidad clínica de tromboembolismo pulmonar, sobre datos sueltos — no cruza el
        catálogo.
      </EncabezadoHerramienta>

      <Calculadora molde={molde} />
    </View>
  );
}
