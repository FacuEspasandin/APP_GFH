import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { Cockpit, Hallazgo } from '@/api/tipos';
import {
  filtrarAvisos,
  filtrarHallazgos,
  mensajeVacio,
  tituloDeVista,
  vistaDesdeParams,
} from '@/dominio/hallazgos';
import { Cargando, Estado, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { ChipSeveridad, Espina } from '@/ui/severidad';
import { COLOR_SEVERIDAD } from '@gfh/shared-types';

/**
 * Detalle de hallazgos: todos, por categoría, por fármaco o los avisos.
 *
 * Una sola pantalla para los cuatro cortes: la diferencia es qué se filtra, no
 * cómo se muestra. Duplicarla en seis archivos sería seis lugares donde la
 * espina puede quedar de un color distinto.
 *
 * Qué se filtra está en `@/dominio/hallazgos` y no acá. Era un ternario
 * anidado adentro del JSX y le faltaba el caso «sin parámetros» —el que usa
 * «Ver los N hallazgos»—, que caía en el filtro por fármaco con el id vacío:
 * el cockpit decía 11 y la pantalla decía que no había ninguno. Un filtro que
 * devuelve vacío no tira ningún error y no lo ve ningún barrido.
 */
export default function Hallazgos() {
  const params = useLocalSearchParams<{
    id: string;
    categoria?: string;
    prescripcion?: string;
    avisos?: string;
  }>();
  const id = params.id;
  const vista = vistaDesdeParams(params);
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

  const titulo = tituloDeVista(vista, (pid) => nombres.get(pid));
  const lista = filtrarHallazgos(vista, data.hallazgos);
  // Los avisos de esta categoría o fármaco van acá y no en el cockpit:
  // pertenecen al detalle, no al resumen.
  const avisosRelevantes = filtrarAvisos(vista, data.avisos);

  const prescripcionActual =
    vista.tipo === 'prescripcion'
      ? (data.prescripciones.find((x) => x.id === vista.prescripcionId) ?? null)
      : null;

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
          <Text className="font-sans text-meta text-ink">{mensajeVacio(vista)}</Text>
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

  // Los hallazgos graves y moderados se elevan; los informativos quedan planos.
  // En una lista de catorce, la profundidad ordena la lectura antes de que el
  // ojo llegue a leer los chips de severidad.
  const pesa = hallazgo.rango <= 1;

  return (
    <Superficie elevacion={pesa ? 'media' : 'plana'} className="mb-2.5 flex-row items-stretch">
      <Espina rango={hallazgo.rango} />
      <View className="flex-1 px-3.5 py-3.5">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-fila font-medio text-ink">{hallazgo.titulo}</Text>
          <ChipSeveridad rango={hallazgo.rango} />
        </View>

        {hallazgo.subtitulo ? (
          <Text className="font-mono mt-1 text-meta text-ink-suave">{hallazgo.subtitulo}</Text>
        ) : null}

        {hallazgo.detalle ? (
          <Text className="font-sans mt-2 text-meta leading-5 text-ink-suave">{hallazgo.detalle}</Text>
        ) : null}

        {hallazgo.estadoValidacion === 'PENDIENTE' || hallazgo.mostradoPeseARechazo ? (
          // Antes era una palabra gris suelta que parecía un error de maqueta.
          // Como pastilla delineada se lee como lo que es: una marca de
          // procedencia del contenido, no una alerta más.
          <View className="mt-2.5 flex-row">
            <View className="flex-row items-center rounded-chip border border-line px-2 py-0.5">
              <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-ink-suave" />
              <Text className="font-medio text-eyebrow uppercase tracking-wider text-ink-suave">
                {hallazgo.mostradoPeseARechazo ? 'Observado' : 'Sin validar'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Motor §8.1: una interacción ofrece alternativas para los DOS fármacos
            del par; una alerta señala uno solo. */}
        {ofreceAlternativas ? (
          <View className="mt-3 flex-row flex-wrap gap-2 border-t border-line pt-3">
            {hallazgo.prescripcionIds.map((pid) => (
              // Secundarios y no sólidos: lo que importa de esta tarjeta es la
              // severidad. Dos botones llenos de color de marca competían con
              // ella y hacían que la alerta se leyera segunda.
              <Pressable
                key={pid}
                onPress={() => onAlternativas(pid)}
                accessibilityRole="button"
                className="flex-row items-center rounded-chip border border-line bg-paper px-3 py-2"
              >
                <Text className="text-meta font-medio text-accent">
                  Alternativas a {nombres.get(pid) ?? 'este fármaco'}
                </Text>
                <Text className="ml-1.5 text-meta font-medio text-accent">›</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Superficie>
  );
}
