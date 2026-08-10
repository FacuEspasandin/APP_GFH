import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { api, cerrarSesionLocal } from '@/api/cliente';
import { Card, Eyebrow, FilaAccion, Pantalla } from '@/ui/kit';

interface Perfil {
  id: string;
  email: string;
  nombreUsuario: string;
  nombre: string;
  apellido: string;
  rol: string;
}

export default function PerfilPantalla() {
  const router = useRouter();
  const { data } = useQuery({ queryKey: ['perfil'], queryFn: () => api.get<Perfil>('/auth/yo') });

  return (
    <Pantalla>
      <Card className="mb-5 px-3.5 py-3.5">
        <Text className="text-fila font-fuerte text-ink">
          {data ? `${data.nombre} ${data.apellido}` : '—'}
        </Text>
        <Text className="font-sans mt-0.5 text-meta text-ink-suave">{data?.email ?? ''}</Text>
        <View className="mt-2 self-start rounded-full bg-primary-light px-2 py-0.5">
          <Text className="text-eyebrow font-fuerte uppercase tracking-wider text-primary">
            {data?.rol ?? ''}
          </Text>
        </View>
      </Card>

      <Eyebrow>Cuenta</Eyebrow>
      <FilaAccion titulo="Editar datos" onPress={() => router.push('/perfil/cuenta')} />
      <FilaAccion titulo="Cambiar contraseña" onPress={() => router.push('/perfil/password')} />
      <FilaAccion titulo="Sesiones activas" onPress={() => router.push('/perfil/sesiones')} />

      <View className="mt-3" />
      <Eyebrow>Configuración</Eyebrow>
      <FilaAccion titulo="Tema y notificaciones" onPress={() => router.push('/perfil/configuracion')} />

      <View className="mt-3" />
      <Eyebrow>Facturación</Eyebrow>
      <FilaAccion titulo="Suscripción" onPress={() => router.push('/perfil/suscripcion')} />

      <View className="mt-3" />
      <Eyebrow>Información</Eyebrow>
      <FilaAccion titulo="Ayuda y soporte" onPress={() => router.push('/perfil/ayuda')} />
      <FilaAccion titulo="Términos y condiciones" onPress={() => router.push('/perfil/terminos')} />
      <FilaAccion titulo="Política de privacidad" onPress={() => router.push('/perfil/privacidad')} />
      <FilaAccion titulo="Acerca de GFH" onPress={() => router.push('/perfil/acerca')} />

      <View className="mt-3" />
      <FilaAccion
        titulo="Cerrar sesión"
        onPress={async () => {
          await cerrarSesionLocal();
          router.replace('/login');
        }}
      />
      <FilaAccion
        titulo="Eliminar cuenta"
        destructiva
        onPress={() => router.push('/perfil/eliminar-cuenta')}
      />
    </Pantalla>
  );
}
