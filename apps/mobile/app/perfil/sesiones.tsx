import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { AvisoNeutro, Boton, Cargando, Card, Estado, Eyebrow, Pantalla } from '@/ui/kit';

interface Sesion {
  id: string;
  dispositivoInfo: string | null;
  creadaAt: string;
  ultimoUsoAt: string | null;
}

/** Sesiones activas (6.8). Una fila por dispositivo con sesión viva. */
export default function Sesiones() {
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

      {(data?.length ?? 0) === 0 ? <Estado titulo="Sin sesiones activas" detalle="No hay otros dispositivos conectados." /> : null}

      {data?.map((s) => (
        <Card key={s.id} className="mb-2 px-3.5 py-3">
          <Text className="text-body font-medio text-ink">{s.dispositivoInfo ?? 'Dispositivo sin identificar'}</Text>
          <Text className="font-sans mt-0.5 text-meta text-ink-suave">
            Desde {new Date(s.creadaAt).toLocaleString('es-UY')}
          </Text>
          <View className="mt-2.5">
            <Boton variante="secundario" onPress={() => revocar.mutate(s.id)} cargando={revocar.isPending}>
              Cerrar esta sesión
            </Boton>
          </View>
        </Card>
      ))}

      <AvisoNeutro>
        Si ves un dispositivo que no reconocés, cerralo y cambiá la contraseña. Cambiarla cierra
        todas las sesiones de una vez.
      </AvisoNeutro>
    </Pantalla>
  );
}
