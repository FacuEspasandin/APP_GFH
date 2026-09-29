import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { moldeRcri } from '@/dominio/molde-rcri';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

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
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="pulso" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Índice de Riesgo Cardíaco</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Riesgo cardíaco prequirúrgico (Lee), sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <Calculadora molde={molde} />
    </View>
  );
}
