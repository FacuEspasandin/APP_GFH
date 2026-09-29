import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { moldeGlasgowBlatchford } from '@/dominio/molde-glasgow-blatchford';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * Glasgow-Blatchford, sobre datos sueltos.
 *
 * Libre y sin red: criterios publicados, no cruza el catálogo. Sin
 * `calcular`: puntaje autosumado, incluida la hemoglobina —cortes por sexo
 * escritos como opciones separadas, ver el comentario del molde.
 */
export default function GlasgowBlatchford() {
  const molde = moldeGlasgowBlatchford();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="alerta" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Glasgow-Blatchford</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Riesgo en hemorragia digestiva alta, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <Calculadora molde={molde} />
    </View>
  );
}
