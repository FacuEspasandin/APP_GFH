import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { Cockpit } from '@/api/tipos';
import {
  colorPorSeveridadAlergia,
  consecuenciaAlergia,
  crucesPorCondicion,
  textoCruces,
} from '@/dominio/condiciones-alergias';
import { Boton, Cargando, Estado, Eyebrow } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
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

  // El cockpit ya está en caché por haber entrado al paciente. De ahí sale con
  // cuántos fármacos cruza cada condición, sin pedirle nada más al servidor.
  const { data: cockpit } = useQuery({
    queryKey: ['cockpit', pacienteId],
    queryFn: () => api.get<Cockpit>(`/pacientes/${pacienteId}/cockpit`),
    enabled: Boolean(pacienteId),
  });

  const cruces = crucesPorCondicion(cockpit?.hallazgos ?? []);
  // Con el cockpit cargado, "no está en el mapa" significa cero cruces — que es
  // un dato, no un dato faltante.
  const crucesListos = cockpit !== undefined;

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

  const condiciones = data?.condiciones ?? [];
  const alergias = data?.alergias ?? [];
  const sinNada = condiciones.length === 0 && alergias.length === 0;

  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="px-4 pb-4 pt-3">
        {sinNada ? (
          <Estado
            titulo="Sin condiciones ni alergias"
            detalle="Cargalas para que se crucen con la medicación."
          />
        ) : null}

        {condiciones.length > 0 ? (
          <>
            <Eyebrow>Condiciones · {condiciones.length}</Eyebrow>
            {condiciones.map((c) => (
              <Fila
                key={c.id}
                nombre={c.nombre}
                meta={c.observaciones ?? textoCruces(cruces[c.id], crucesListos)}
                color={COLOR_SEVERIDAD.neutro}
                onQuitar={() =>
                  confirmar(
                    'Quitar condición',
                    `${c.nombre} deja de cruzarse con la medicación.`,
                    () => quitarCondicion.mutate(c.id),
                  )
                }
              />
            ))}
          </>
        ) : null}

        {alergias.length > 0 ? (
          <>
            <View className="mt-3" />
            <Eyebrow>Alergias · {alergias.length}</Eyebrow>
            {alergias.map((a) => (
              <Fila
                key={a.id}
                nombre={a.nombre}
                meta={a.grupo}
                color={colorPorSeveridadAlergia(a.severidad)}
                consecuencia={consecuenciaAlergia(a)}
                onQuitar={() =>
                  confirmar('Quitar alergia', `${a.nombre} deja de evaluarse.`, () =>
                    quitarAlergia.mutate(a.id),
                  )
                }
              />
            ))}
          </>
        ) : null}

        {alergias.length > 0 ? (
          <Superficie elevacion="plana" className="mb-3 mt-2 px-3.5 py-3">
            {/* Regla 4, dicha donde se ve la consecuencia y no sólo en el motor. */}
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              Sólo la coincidencia exacta con una alergia grave impide prescribir. El cruce por
              familia nunca bloquea: pide que lo confirmes.
            </Text>
          </Superficie>
        ) : null}

        {alergias.some((a) => !a.cruza) ? (
          <Superficie elevacion="plana" className="mb-3 px-3.5 py-3">
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              Una alergia que no cruza quedó registrada pero no coincide con ninguna familia
              conocida, así que no dispara alertas.
            </Text>
          </Superficie>
        ) : null}
      </ScrollView>

      {/* Al pie y no al final del scroll: con seis condiciones cargadas, agregar
          la séptima obligaba a recorrer la lista entera. */}
      <View className="flex-row gap-2.5 border-t border-line bg-surface px-4 py-3">
        <View className="flex-1">
          <Boton
            variante="secundario"
            onPress={() => router.push(`/paciente/${pacienteId}/agregar-condicion` as never)}
          >
            Agregar condición
          </Boton>
        </View>
        <View className="flex-1">
          <Boton
            variante="secundario"
            onPress={() => router.push(`/paciente/${pacienteId}/agregar-alergia` as never)}
          >
            Agregar alergia
          </Boton>
        </View>
      </View>
    </View>
  );
}

function Fila({
  nombre,
  meta,
  color,
  consecuencia,
  onQuitar,
}: {
  nombre: string;
  meta?: string | null;
  color: string;
  consecuencia?: { texto: string; fondo: string; tinta: string };
  onQuitar: () => void;
}) {
  const col = useColores();

  return (
    <Superficie
      elevacion="plana"
      className="mb-2 flex-row items-center px-3.5 py-3"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <View className="flex-1 pr-2">
        <Text className="text-body font-medio text-ink">{nombre}</Text>
        {meta ? (
          <Text className="font-sans mt-0.5 text-meta text-ink-suave">{meta}</Text>
        ) : null}

        {consecuencia ? (
          <View
            className="mt-1.5 self-start rounded-full px-2 py-0.5"
            style={{ backgroundColor: consecuencia.fondo }}
          >
            <Text
              className="font-fuerte text-eyebrow uppercase tracking-wider"
              style={{ color: consecuencia.tinta }}
            >
              {consecuencia.texto}
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable onPress={onQuitar} accessibilityRole="button" accessibilityLabel={`Quitar ${nombre}`}>
        <Text className="font-medio text-meta" style={{ color: col.peligro }}>
          Quitar
        </Text>
      </Pressable>
    </Superficie>
  );
}

