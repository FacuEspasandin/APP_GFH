import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { SkeletonLista } from '@/ui/estados-sistema';
import { useAviso } from '@/ui/aviso';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { fechaLarga } from '@/ui/fecha';
import { Icono } from '@/ui/iconos';
import { AvisoNeutro, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/** Sesiones activas (6.8). Una fila por dispositivo con sesión viva. */
export default function Sesiones() {
  const col = useColores();
  const qc = useQueryClient();
  const { avisar } = useAviso();
  const { data, isLoading } = useQuery({
    queryKey: ['sesiones'],
    queryFn: API.sesiones,
  });

  const revocar = useMutation({
    mutationFn: (id: string) => API.cerrarSesion(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sesiones'] });
      // La fila desaparece de la lista, que ya es una señal. El aviso es para
      // el caso de tener varias: se ve que se fue una sin tener que contarlas.
      avisar('Sesión cerrada');
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoConTitulo titulo="Sesiones Activas" />
        <SkeletonLista filas={3} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Sesiones Activas" />
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
            <View className="flex-row items-center">
              <Text className="text-body font-medio text-ink" numberOfLines={1}>
                {s.dispositivoInfo ?? 'Dispositivo sin identificar'}
              </Text>
              {s.esActual ? (
                <View
                  className="ml-2 rounded-chip px-2 py-0.5"
                  style={{ backgroundColor: col.primaryLight }}
                >
                  <Text
                    className="font-fuerte text-eyebrow uppercase tracking-wider"
                    style={{ color: col.primary }}
                  >
                    Este
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="font-sans text-meta text-ink-suave">
              Desde {fechaLarga(s.creadaAt)}
            </Text>
          </View>

          {/* La acción va como texto y no como botón de ancho completo: con
              tres dispositivos eran tres barras verdes apiladas compitiendo
              entre sí y con lo que de verdad importa, el nombre. */}
          {/* La actual no se ofrece cerrar: hacerlo desde acá deja al médico
              afuera de la app sin avisarle qué hizo. Para eso está «Cerrar
              sesión» en el perfil, que sí lo dice. El backend lo rechaza
              igual — esto sólo evita ofrecer algo que va a fallar. */}
          {s.esActual ? null : (
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
          )}
        </Superficie>
      ))}

      <AvisoNeutro>
        Si ves un dispositivo que no reconocés, cerralo y cambiá la contraseña. Cambiarla cierra
        todas las sesiones de una vez.
      </AvisoNeutro>
      </Pantalla>
    </View>
  );
}
