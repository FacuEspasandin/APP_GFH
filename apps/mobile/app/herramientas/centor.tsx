import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeCentor } from '@/dominio/molde-centor';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Centor (McIsaac), sobre datos sueltos.
 *
 * Libre y sin red: criterios publicados, no cruza el catálogo. Sin
 * `calcular`: puntaje autosumado, incluido el punto negativo de la edad.
 */
export default function Centor() {
  const molde = moldeCentor();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="alerta" titulo="Centor (McIsaac)">
        Probabilidad de faringitis estreptocócica, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <Calculadora molde={molde} />
    </View>
  );
}
