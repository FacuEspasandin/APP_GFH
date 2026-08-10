import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { AvisoNeutro, Boton, Cargando, Card, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { COLOR_SEVERIDAD } from '@gfh/shared-types';

interface Datos {
  condiciones: Array<{ id: string; codigo: string; nombre: string; observaciones: string | null }>;
  alergias: Array<{
    id: string;
    tipo: string;
    severidad: 'LEVE' | 'MODERADA' | 'GRAVE';
    nombre: string;
    grupo: string | null;
    cruza: boolean;
  }>;
}

/** Condiciones y alergias activas (3.4.4), con la opción de quitarlas. */
export default function CondicionesYAlergias() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['condiciones-alergias', pacienteId],
    queryFn: () => api.get<Datos>(`/perfil/pacientes/${pacienteId}/condiciones-alergias`),
    enabled: Boolean(pacienteId),
  });

  const invalidar = async () => {
    await qc.invalidateQueries({ queryKey: ['condiciones-alergias', pacienteId] });
    await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
  };

  const quitarCondicion = useMutation({
    mutationFn: (condicionId: string) =>
      api.delete(`/pacientes/${pacienteId}/condiciones/${condicionId}`),
    onSuccess: invalidar,
  });

  const quitarAlergia = useMutation({
    mutationFn: (alergiaId: string) => api.delete(`/alergias/${alergiaId}`),
    onSuccess: invalidar,
  });

  const confirmar = (titulo: string, mensaje: string, accion: () => void) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: accion },
    ]);

  if (isLoading) return <Cargando />;

  const sinNada = (data?.condiciones.length ?? 0) === 0 && (data?.alergias.length ?? 0) === 0;

  return (
    <Pantalla>
      {sinNada ? (
        <Estado
          titulo="Sin condiciones ni alergias"
          detalle="Cargalas para que se crucen con la medicación."
          accion="Agregar condición"
          onAccion={() => router.push(`/paciente/${pacienteId}/agregar-condicion` as never)}
        />
      ) : null}

      {(data?.condiciones.length ?? 0) > 0 ? (
        <>
          <Eyebrow>Condiciones</Eyebrow>
          {data?.condiciones.map((c) => (
            <Card key={c.id} className="mb-2 flex-row items-center px-3.5 py-3">
              <View className="flex-1">
                <Text className="text-body font-medio text-ink">{c.nombre}</Text>
                {c.observaciones ? (
                  <Text className="font-sans mt-0.5 text-meta text-ink-suave">{c.observaciones}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() =>
                  confirmar('Quitar condición', `${c.nombre} deja de cruzarse con la medicación.`, () =>
                    quitarCondicion.mutate(c.id),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${c.nombre}`}
                className="px-2 py-1"
              >
                <Text className="text-meta font-medio" style={{ color: '#991B1B' }}>
                  Quitar
                </Text>
              </Pressable>
            </Card>
          ))}
        </>
      ) : null}

      {(data?.alergias.length ?? 0) > 0 ? (
        <>
          <View className="mt-3" />
          <Eyebrow>Alergias</Eyebrow>
          {data?.alergias.map((a) => (
            <View
              key={a.id}
              className="mb-2 flex-row items-center overflow-hidden rounded-card border border-line bg-surface"
              style={{
                borderLeftWidth: 4,
                borderLeftColor:
                  a.severidad === 'GRAVE'
                    ? COLOR_SEVERIDAD.grave
                    : a.severidad === 'MODERADA'
                      ? COLOR_SEVERIDAD.media
                      : COLOR_SEVERIDAD.neutro,
              }}
            >
              <View className="flex-1 px-3.5 py-3">
                <Text className="text-body font-medio text-ink">{a.nombre}</Text>
                <Text className="font-sans mt-0.5 text-meta text-ink-suave">
                  {a.severidad.toLowerCase()}
                  {a.grupo ? ` · ${a.grupo}` : ''}
                </Text>
                {!a.cruza ? (
                  <Text className="font-sans mt-1 text-eyebrow uppercase tracking-wider text-ink-suave">
                    No cruza con fármacos
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() =>
                  confirmar('Quitar alergia', `${a.nombre} deja de evaluarse.`, () =>
                    quitarAlergia.mutate(a.id),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${a.nombre}`}
                className="px-3.5 py-3"
              >
                <Text className="text-meta font-medio" style={{ color: '#991B1B' }}>
                  Quitar
                </Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : null}

      {data?.alergias.some((a) => !a.cruza) ? (
        <AvisoNeutro>
          Una alergia que no cruza quedó registrada pero no coincide con ninguna familia conocida,
          así que no dispara alertas.
        </AvisoNeutro>
      ) : null}

      <View className="mt-4 gap-2">
        <Boton
          variante="secundario"
          onPress={() => router.push(`/paciente/${pacienteId}/agregar-condicion` as never)}
        >
          Agregar condición
        </Boton>
        <Boton
          variante="secundario"
          onPress={() => router.push(`/paciente/${pacienteId}/agregar-alergia` as never)}
        >
          Agregar alergia
        </Boton>
      </View>
    </Pantalla>
  );
}
