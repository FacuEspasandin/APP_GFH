import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { haySesion } from '@/api/cliente';

/** Splash (1.1). Decide entre Bienvenida e Inicio según la sesión guardada. */
export default function Entrada() {
  const [estado, setEstado] = useState<'cargando' | 'con-sesion' | 'sin-sesion'>('cargando');

  useEffect(() => {
    void haySesion().then((hay) => setEstado(hay ? 'con-sesion' : 'sin-sesion'));
  }, []);

  if (estado === 'cargando') {
    return (
      <View className="flex-1 items-center justify-center bg-primary">
        <View className="h-20 w-20 items-center justify-center rounded-card bg-white/10">
          <Text className="text-xl font-fuerte tracking-widest text-white">GFH</Text>
        </View>
        <ActivityIndicator color="#FFFFFF" className="mt-8" />
      </View>
    );
  }

  return <Redirect href={estado === 'con-sesion' ? '/(tabs)' : '/bienvenida'} />;
}
