import { Stack } from 'expo-router';
import { View } from 'react-native';

import { moldeGlasgowBlatchford } from '@/dominio/molde-glasgow-blatchford';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

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
      <EncabezadoHerramienta icono="alerta" titulo="Glasgow-Blatchford">
        Riesgo en hemorragia digestiva alta, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <Calculadora molde={molde} />
    </View>
  );
}
