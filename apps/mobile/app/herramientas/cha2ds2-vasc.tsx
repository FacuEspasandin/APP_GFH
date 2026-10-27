import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeCha2ds2Vasc } from '@/dominio/molde-cha2ds2-vasc';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * CHA2DS2-VASc, sobre datos sueltos.
 *
 * Libre y sin red: son criterios publicados, no cruza el catálogo. Sin
 * `calcular`: el resultado es de tipo puntaje, autosumado de los puntos que
 * declara cada criterio. Complementa a HAS-BLED —ésta es riesgo de ACV, la
 * otra es riesgo de sangrado— la decisión de anticoagular mira las dos.
 */
export default function Cha2ds2Vasc() {
  const molde = moldeCha2ds2Vasc();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="pulso" titulo="CHA2DS2-VASc">
        Riesgo de ACV en fibrilación auricular, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <Calculadora molde={molde} />
    </View>
  );
}
