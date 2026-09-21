import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { moldeQsofa } from '@/dominio/molde-qsofa';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * qSOFA, sobre datos sueltos.
 *
 * Libre y sin red: screening publicado, no cruza el catálogo. Sin
 * `calcular`: el resultado es de tipo puntaje, autosumado. El ítem del
 * sensorio pregunta directo por el Glasgow (menor a 15) en vez de abrir el
 * selector completo — es lo que mantiene esto como screening rápido a la
 * cabecera.
 */
export default function Qsofa() {
  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="alerta" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">qSOFA</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Screening de sepsis a la cabecera, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>
      <Calculadora molde={moldeQsofa()} />
    </View>
  );
}
