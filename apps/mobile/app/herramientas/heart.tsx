import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeHeart } from '@/dominio/molde-heart';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * HEART score, sobre datos sueltos.
 *
 * Libre y sin red: criterios publicados, no cruza el catálogo. Sin
 * `calcular`: puntaje autosumado.
 */
export default function Heart() {
  const molde = moldeHeart();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="pulso" titulo="HEART score">
        Riesgo en dolor torácico, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <Calculadora molde={molde} />
    </View>
  );
}
