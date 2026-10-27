import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeQsofa } from '@/dominio/molde-qsofa';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

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
      <EncabezadoHerramienta icono="alerta" titulo="qSOFA">
        Screening de sepsis a la cabecera, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>
      <Calculadora molde={moldeQsofa()} />
    </View>
  );
}
