import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { Icono } from '@/ui/iconos';
import { AvisoNeutro, Cargando, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

interface Sesion {
  id: string;
  dispositivoInfo: string | null;
  creadaAt: string;
  ultimoUsoAt: string | null;
}

/** Sesiones activas (6.8). Una fila por dispositivo con sesión viva. */
export default function Sesiones() {
  const col = useColores();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['sesiones'],
    queryFn: () => api.get<Sesion[]>('/auth/sesiones'),
  });

  const revocar = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sesiones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sesiones'] }),
  });

  if (isLoading) return <Cargando />;

  return (
    <Pantalla>
      <Eyebrow>Dispositivos con sesión abierta</Eyebrow>

      {(data?.length ?? 0) === 0 ? (
        <Estado titulo="Sin sesiones activas" detalle="No hay otros dispositivos conectados." />
      ) : null}

      {data?.map((s) => (
        <Superficie key={s.id} elevacion="plana" className="mb-2.5 flex-row items-center px-3.5 py-3">
          <View className="mr-3 items-center justify-center rounded" style={{ width: 26, height: 26, backgroundColor: col.primaryLight }}>
            <Icono nombre="dispositivo" tamano={15} color={col.primary} />
          </View>

          <View className="flex-1 pr-2">
            <Text className="text-body font-medio text-ink" numberOfLines={1}>
              {s.dispositivoInfo ?? 'Dispositivo sin identificar'}
            </Text>
            <Text className="font-sans text-meta text-ink-suave">
              Desde {new Date(s.creadaAt).toLocaleDateString('es-UY')}
            </Text>
          </View>

          {/* La acción va como texto y no como botón de ancho completo: con
              tres dispositivos eran tres barras verdes apiladas compitiendo
              entre sí y con lo que de verdad importa, el nombre. */}
          <Pressable
            onPress={() => revocar.mutate(s.id)}
            disabled={revocar.isPending}
            accessibilityRole="button"
            accessibilityLabel={`Cerrar la sesión de ${s.dispositivoInfo ?? 'este dispositivo'}`}
            className="rounded-chip border border-line px-2.5 py-1.5"
          >
            <Text className="font-medio text-meta" style={{ color: col.peligro }}>
              Cerrar
            </Text>
          </Pressable>
        </Superficie>
      ))}

      <AvisoNeutro>
        Si ves un dispositivo que no reconocés, cerralo y cambiá la contraseña. Cambiarla cierra
        todas las sesiones de una vez.
      </AvisoNeutro>
    </Pantalla>
  );
}
