import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { bloqueoActivo, pedirHuella } from '@/api/bloqueo';
import { cerrarSesionLocal, haySesion } from '@/api/cliente';

/** Splash (1.1). Decide entre Bienvenida e Inicio según la sesión guardada, y
 *  pide la huella en el medio si el bloqueo está prendido. */
export default function Entrada() {
  const [estado, setEstado] = useState<'cargando' | 'con-sesion' | 'sin-sesion' | 'bloqueado'>(
    'cargando',
  );

  const desbloquear = useCallback(async () => {
    setEstado('cargando');
    setEstado((await pedirHuella()) ? 'con-sesion' : 'bloqueado');
  }, []);

  useEffect(() => {
    void (async () => {
      if (!(await haySesion())) {
        setEstado('sin-sesion');
        return;
      }
      if (!(await bloqueoActivo())) {
        setEstado('con-sesion');
        return;
      }
      await desbloquear();
    })();
  }, [desbloquear]);

  /*
   * La huella NUNCA es la única llave (ver `api/bloqueo.ts`): si falla, se
   * rechaza, o el médico prefiere no usarla, sale por la contraseña. Cerrar la
   * sesión local es lo que lo lleva al login — no se pierde nada del servidor.
   */
  if (estado === 'bloqueado') {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: '#006D37' }}>
        <View className="h-20 w-20 items-center justify-center rounded-lg bg-white/10">
          <Text className="text-xl font-fuerte tracking-widest text-white">GFH</Text>
        </View>
        <Text className="mt-8 text-center text-body leading-6 text-white">
          La app está bloqueada.
        </Text>

        <Pressable
          onPress={() => void desbloquear()}
          accessibilityRole="button"
          className="mt-6 h-12 w-full items-center justify-center rounded-full bg-white"
        >
          <Text className="text-fila font-fuerte" style={{ color: '#006D37' }}>
            Reintentar
          </Text>
        </Pressable>

        <Pressable
          onPress={() => void cerrarSesionLocal().then(() => setEstado('sin-sesion'))}
          accessibilityRole="button"
          className="mt-3 h-12 w-full items-center justify-center rounded-full border border-white/40"
        >
          <Text className="text-fila font-medio text-white">Entrar con contraseña</Text>
        </Pressable>
      </View>
    );
  }

  if (estado === 'cargando') {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#006D37' }}>
        <View className="h-20 w-20 items-center justify-center rounded-lg bg-white/10">
          <Text className="text-xl font-fuerte tracking-widest text-white">GFH</Text>
        </View>
        <ActivityIndicator color="#FFFFFF" className="mt-8" />
      </View>
    );
  }

  return <Redirect href={estado === 'con-sesion' ? '/(tabs)' : '/bienvenida'} />;
}
