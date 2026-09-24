import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { moldeCha2ds2Vasc } from '@/dominio/molde-cha2ds2-vasc';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

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
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="pulso" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">CHA2DS2-VASc</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Riesgo de ACV en fibrilación auricular, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <Calculadora molde={molde} />
    </View>
  );
}
