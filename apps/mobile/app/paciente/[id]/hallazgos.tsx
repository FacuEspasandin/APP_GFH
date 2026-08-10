import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { CategoriaHallazgo, Cockpit, Hallazgo } from '@/api/tipos';
import { Cargando, Estado, Pantalla } from '@/ui/kit';
import { ChipSeveridad, Espina } from '@/ui/severidad';
import { COLOR_SEVERIDAD } from '@gfh/shared-types';

const TITULO: Record<CategoriaHallazgo, string> = {
  INTERACCION: 'Interacciones',
  CONDICION: 'Condiciones y alergias',
  AJUSTE_RENAL: 'Ajuste renal',
  AJUSTE_HEPATICO: 'Ajuste hepático',
};

const VACIO: Record<CategoriaHallazgo, string> = {
  INTERACCION: 'Ninguna interacción conocida entre los fármacos cargados.',
  CONDICION: 'Ninguna alerta por las condiciones y alergias cargadas.',
  AJUSTE_RENAL: 'Ningún fármaco necesita ajuste con este Clcr.',
  AJUSTE_HEPATICO: 'Sin tabla de ajuste hepático todavía.',
};

/**
 * Detalle de hallazgos, filtrado por categoría, por fármaco o los avisos.
 *
 * Una sola pantalla para los tres cortes: la diferencia es qué se filtra, no
 * cómo se muestra. Duplicarla en seis archivos sería seis lugares donde la
 * espina puede quedar de un color distinto.
 */
export default function Hallazgos() {
  const { id, categoria, prescripcion, avisos } = useLocalSearchParams<{
    id: string;
    categoria?: CategoriaHallazgo;
    prescripcion?: string;
    avisos?: string;
  }>();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cockpit', id],
    queryFn: () => api.get<Cockpit>(`/pacientes/${id}/cockpit`),
    enabled: Boolean(id),
  });

  if (isLoading) return <Cargando />;
  if (error || !data) {
    return (
      <Pantalla>
        <Estado titulo="No se pudo cargar" detalle={String((error as Error)?.message ?? '')} />
      </Pantalla>
    );
  }

  const nombres = new Map(data.prescripciones.map((x) => [x.id, x.nombre]));
  const mostrandoAvisos = avisos === '1';

  const titulo = mostrandoAvisos
    ? 'Datos faltantes'
    : categoria
      ? TITULO[categoria]
      : (nombres.get(prescripcion ?? '') ?? 'Hallazgos');

  const lista = mostrandoAvisos
    ? []
    : categoria
      ? data.hallazgos.filter((h) => h.categoria === categoria)
      : data.hallazgos.filter((h) => h.prescripcionIds.includes(prescripcion ?? ''));

  // Los avisos de esta categoría/fármaco se muestran acá y no en el cockpit:
  // pertenecen al detalle, no al resumen.
  const avisosRelevantes = mostrandoAvisos
    ? data.avisos
    : prescripcion
      ? data.avisos.filter((a) => a.prescripcionId === prescripcion)
      : categoria === 'AJUSTE_RENAL'
        ? data.avisos.filter((a) => a.codigo === 'SIN_CLCR' || a.codigo === 'FARMACO_LIBRE_CLCR_BAJO')
        : categoria === 'AJUSTE_HEPATICO'
          ? data.avisos.filter((a) => a.codigo === 'SIN_CHILD_PUGH')
          : categoria === 'CONDICION'
            ? data.avisos.filter((a) => a.codigo === 'SIN_SEMANA_GESTACION')
            : [];

  const prescripcionActual = prescripcion ? data.prescripciones.find((x) => x.id === prescripcion) : null;

  return (
    <Pantalla>
      <Stack.Screen options={{ title: titulo }} />

      {prescripcionActual ? (
        <View className="mb-4 rounded-card border border-line bg-surface px-3.5 py-3">
          <Text className="text-body font-medio text-ink">{prescripcionActual.nombre}</Text>
          <Text className="font-sans mt-0.5 text-meta text-ink-suave">
            {prescripcionActual.dosis} · {prescripcionActual.frecuencia} ·{' '}
            {prescripcionActual.via.toLowerCase()}
          </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/prescripcion/[id]',
                params: {
                  id: prescripcionActual.id,
                  paciente: id,
                  nombre: prescripcionActual.nombre,
                  dosis: prescripcionActual.dosis,
                  frecuencia: prescripcionActual.frecuencia,
                  via: prescripcionActual.via,
                },
              } as never)
            }
            accessibilityRole="button"
            className="mt-2 self-start"
          >
            <Text className="text-meta font-medio text-accent">Editar o suspender</Text>
          </Pressable>
        </View>
      ) : null}

      {lista.length === 0 && avisosRelevantes.length === 0 ? (
        // El panel vacío se colapsa a una línea verde, no a una tarjeta grande
        // que ocupe el lugar de algo que sí importa.
        <View
          className="rounded-card border border-line bg-surface px-3.5 py-3"
          style={{ borderLeftWidth: 4, borderLeftColor: COLOR_SEVERIDAD.ok }}
        >
          <Text className="font-sans text-meta text-ink">
            {categoria ? VACIO[categoria] : 'Sin hallazgos para este fármaco.'}
          </Text>
        </View>
      ) : null}

      {lista.map((h) => (
        <Tarjeta
          key={h.clave}
          hallazgo={h}
          nombres={nombres}
          onAlternativas={(pid) =>
            router.push(`/paciente/${id}/alternativas?prescripcion=${pid}` as never)
          }
        />
      ))}

      {avisosRelevantes.map((a) => (
        <View
          key={a.codigo + (a.prescripcionId ?? '')}
          className="mb-2 rounded-card border border-line bg-surface px-3.5 py-3"
          style={{ borderLeftWidth: 4, borderLeftColor: COLOR_SEVERIDAD.neutro }}
        >
          <Text className="font-sans text-meta leading-5 text-ink">{a.detalle}</Text>
        </View>
      ))}
    </Pantalla>
  );
}

function Tarjeta({
  hallazgo,
  nombres,
  onAlternativas,
}: {
  hallazgo: Hallazgo;
  nombres: Map<string, string>;
  onAlternativas: (prescripcionId: string) => void;
}) {
  const ofreceAlternativas =
    hallazgo.categoria === 'INTERACCION' || hallazgo.categoria === 'CONDICION';

  return (
    <View className="mb-2 flex-row items-stretch overflow-hidden rounded-card border border-line bg-surface">
      <Espina rango={hallazgo.rango} />
      <View className="flex-1 px-3.5 py-3">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-body font-medio text-ink">{hallazgo.titulo}</Text>
          <ChipSeveridad rango={hallazgo.rango} />
        </View>

        {hallazgo.detalle ? (
          <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">{hallazgo.detalle}</Text>
        ) : null}

        {hallazgo.estadoValidacion === 'PENDIENTE' || hallazgo.mostradoPeseARechazo ? (
          <Text className="font-sans mt-1.5 text-eyebrow uppercase tracking-wider text-ink-suave">
            {hallazgo.mostradoPeseARechazo ? 'Observado' : 'Borrador'}
          </Text>
        ) : null}

        {/* Motor §8.1: una interacción ofrece alternativas para los DOS fármacos
            del par; una alerta señala uno solo. */}
        {ofreceAlternativas ? (
          <View className="mt-2.5 gap-2">
            {hallazgo.prescripcionIds.map((pid) => (
              <Pressable
                key={pid}
                onPress={() => onAlternativas(pid)}
                accessibilityRole="button"
                className="self-start rounded-chip bg-primary px-3 py-2"
              >
                <Text className="text-meta font-fuerte text-white">
                  Alternativas a {nombres.get(pid) ?? 'este fármaco'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
