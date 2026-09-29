import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { moldeCharlson } from '@/dominio/molde-charlson';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

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
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="alerta" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Índice de Charlson</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Comorbilidad y sobrevida a 10 años, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <Calculadora molde={molde} />
    </View>
  );
}
