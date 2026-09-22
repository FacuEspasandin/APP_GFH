import { Stack } from 'expo-router';
import { View } from 'react-native';

import { EncabezadoApp } from '@/ui/encabezado-app';
import { Estado } from '@/ui/kit';

/**
 * Chat con IA — placeholder.
 *
 * El botón central del navbar ya apunta acá (ver `menu-inferior.tsx`). El
 * chat real (mensajes, tool-calling contra el motor clínico, chip de fuente
 * por respuesta) se construye del lado del backend primero — esta pantalla
 * sólo reserva el lugar para no romper la navegación mientras tanto.
 */
export default function ChatIa() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp ocultarVolver />
      <View className="flex-1 bg-paper">
        <Estado
          titulo="Chat con IA"
          detalle="Todavía en construcción — responde preguntas sobre fármacos usando la base propia de GFH, nunca de memoria."
        />
      </View>
    </>
  );
}
