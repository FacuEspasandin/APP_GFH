import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeNihss } from '@/dominio/molde-nihss';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * NIHSS, sobre datos sueltos.
 *
 * Libre y sin red: criterios publicados, no cruza el catálogo. Es la
 * calculadora más larga (15 ítems) — la cascada existe justo para esto, para
 * que quince criterios no sean una sola pantalla de scroll infinito.
 */
export default function Nihss() {
  const molde = moldeNihss();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="glasgow" titulo="NIHSS">
        Severidad de ACV, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <Calculadora molde={molde} />
    </View>
  );
}
