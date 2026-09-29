import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { moldeCentor } from '@/dominio/molde-centor';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

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
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="alerta" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Centor (McIsaac)</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Probabilidad de faringitis estreptocócica, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <Calculadora molde={molde} />
    </View>
  );
}
