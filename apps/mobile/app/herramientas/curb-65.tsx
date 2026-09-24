import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { moldeCurb65 } from '@/dominio/molde-curb65';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

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
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="alerta" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">CURB-65</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Severidad de neumonía adquirida en la comunidad, sobre datos sueltos — no cruza el
          catálogo.
        </Text>
      </View>

      <Calculadora molde={molde} />
    </View>
  );
}
