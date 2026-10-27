import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeCurb65 } from '@/dominio/molde-curb65';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * CURB-65, sobre datos sueltos.
 *
 * Libre y sin red: son criterios publicados, no cruza el catálogo. Sin
 * `calcular`: el resultado es de tipo puntaje, autosumado de los puntos que
 * declara cada criterio.
 */
export default function Curb65() {
  const molde = moldeCurb65();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="alerta" titulo="CURB-65">
        Severidad de neumonía adquirida en la comunidad, sobre datos sueltos — no cruza el
        catálogo.
      </EncabezadoHerramienta>

      <Calculadora molde={molde} />
    </View>
  );
}
