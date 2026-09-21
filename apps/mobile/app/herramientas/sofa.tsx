import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { moldeSofa } from '@/dominio/molde-sofa';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';

/**
 * SOFA completo, sobre datos sueltos.
 *
 * Libre y sin red, seis sistemas publicados. Sin `calcular`: el resultado
 * es de tipo puntaje, autosumado de las bandas de cada sistema —incluida la
 * opción «No aplica» de cardiovascular, que suma 0—. Un solo tramo cubre
 * todo el rango: el informe es explícito en que el SOFA no tiene una
 * categoría fija, importa la tendencia en el tiempo.
 *
 * `KeyboardAvoidingView` porque cuatro de los seis sistemas tienen un valor
 * exacto opcional (mismo patrón que Child-Pugh en la pantalla del
 * paciente), y ese sí abre teclado numérico.
 */
export default function Sofa() {
  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="alerta" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">SOFA completo</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Disfunción orgánica en 6 sistemas, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora molde={moldeSofa()} />
      </KeyboardAvoidingView>
    </View>
  );
}
