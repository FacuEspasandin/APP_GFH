import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { SkeletonLista } from '@/ui/estados-sistema';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { antiguedad } from '@/ui/fecha';
import { Icono } from '@/ui/iconos';
import { Estado, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Historial de conversaciones con Vera.
 *
 * Sólo lectura — retomar una conversación no manda todo lo que tiene guardado
 * a Claude: el backend ya corta a los últimos 20 mensajes por request
 * (`VENTANA_HISTORIAL_MENSAJES`), sin importar cuántos haya en total acá.
 */
export default function HistorialChat() {
  const col = useColores();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['chat', 'sesiones'],
    queryFn: API.sesionesChat,
  });

  const retomar = (sessionId: string) => {
    router.push(`/(tabs)/chat?sessionId=${encodeURIComponent(sessionId)}` as never);
  };

  const nuevaConversacion = () => {
    router.push('/(tabs)/chat?sessionId=nueva' as never);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoConTitulo titulo="Conversaciones" />
        <SkeletonLista filas={4} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Conversaciones" />
      <Pantalla>
        <Pressable
          onPress={nuevaConversacion}
          accessibilityRole="button"
          accessibilityLabel="Nueva conversación"
          className="mb-3.5 flex-row items-center justify-center gap-2 rounded-card py-3.5"
          style={{ backgroundColor: col.primary }}
        >
          <Icono nombre="mas" tamano={16} color="#FFFFFF" />
          <Text className="font-fuerte text-body text-white">Nueva conversación</Text>
        </Pressable>

        {(data?.length ?? 0) === 0 ? (
          <Estado titulo="Sin conversaciones todavía" detalle="Las preguntas que le hagas a Vera van a aparecer acá." />
        ) : null}

        {data?.map((s) => (
          <Pressable key={s.id} onPress={() => retomar(s.id)} accessibilityRole="button">
            <Superficie elevacion="plana" className="mb-2.5 flex-row items-center px-3.5 py-3">
              <View
                className="mr-3 items-center justify-center rounded-full"
                style={{ width: 34, height: 34, backgroundColor: col.primaryLight }}
              >
                <Icono nombre="chat" tamano={16} color={col.primary} />
              </View>

              <View className="flex-1 pr-2">
                <Text className="text-body font-medio text-ink" numberOfLines={1}>
                  {s.titulo ?? 'Conversación sin título'}
                </Text>
                <Text className="font-sans text-meta text-ink-suave">
                  {antiguedad(s.createdAt)} · {s.cantidadMensajes}{' '}
                  {s.cantidadMensajes === 1 ? 'mensaje' : 'mensajes'}
                </Text>
              </View>

              <Icono nombre="chevron" tamano={16} color={col.tenue} />
            </Superficie>
          </Pressable>
        ))}
      </Pantalla>
    </View>
  );
}
