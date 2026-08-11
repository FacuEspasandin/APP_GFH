import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import {
  familiaDe,
  hora,
  leerCambio,
  MOTIVO_DE_VACIO,
  porDia,
  type CambioEvento,
  type Evento,
  type FamiliaEvento,
  type Historial,
} from '@/dominio/historial';
import { Cargando, Estado, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Historial del paciente.
 *
 * Es la única pantalla que mira para atrás: todo lo demás en la app responde
 * «¿esto es seguro hoy?». Acá se contesta «¿qué le hicimos a este paciente y
 * cuándo?», que es lo que hace falta para explicar una decisión meses después.
 *
 * El texto de cada línea llega escrito del backend a propósito — ver
 * `EventoPaciente` en el esquema. La app no lo rearma: si lo hiciera, un
 * fármaco borrado dejaría la línea en blanco justo cuando más importa.
 */
export default function HistorialPaciente() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['historial', pacienteId],
      // El cursor es la fecha del último evento que ya tenemos, no un número de
      // página: la lista crece por arriba y con `skip` se repetirían filas.
      queryFn: ({ pageParam }) =>
        api.get<Historial>(
          `/pacientes/${pacienteId}/historial${pageParam ? `?antesDe=${encodeURIComponent(pageParam)}` : ''}`,
        ),
      initialPageParam: '' as string,
      getNextPageParam: (ultima) =>
        ultima.hayMas && ultima.eventos.length > 0
          ? ultima.eventos[ultima.eventos.length - 1]!.createdAt
          : undefined,
      enabled: Boolean(pacienteId),
    });

  if (isLoading) return <Cargando />;

  if (error || !data) {
    return (
      <Pantalla>
        <Estado
          titulo="No se pudo cargar el historial"
          detalle={error instanceof Error ? error.message : 'Error desconocido.'}
          accion="Reintentar"
          onAccion={() => void refetch()}
        />
      </Pantalla>
    );
  }

  const eventos = data.pages.flatMap((p) => p.eventos);
  const dias = porDia(eventos, new Date());

  if (eventos.length === 0) {
    return (
      <Pantalla>
        <Estado titulo="Sin movimientos" detalle={MOTIVO_DE_VACIO} />
      </Pantalla>
    );
  }

  return (
    // El `pb-24` deja pasar la barra inferior: es lo último de la lista lo que
    // quedaría abajo de todo, y el evento más viejo del paciente es
    // justamente el que se va a buscar.
    <ScrollView className="flex-1 bg-paper" contentContainerClassName="px-4 pb-24 pt-3">
      {dias.map((dia) => (
        <View key={dia.clave} className="mb-1">
          <Text className="font-mono-fuerte mb-1 mt-3 text-eyebrow uppercase tracking-wider text-ink-suave">
            {dia.titulo}
          </Text>
          {dia.eventos.map((e, i) => (
            <Linea
              key={e.id}
              evento={e}
              primero={i === 0}
              ultimo={i === dia.eventos.length - 1 && dia === dias[dias.length - 1]}
            />
          ))}
        </View>
      ))}

      {hasNextPage ? (
        <Pressable
          onPress={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
          accessibilityRole="button"
          className="mt-4 items-center rounded-card border border-line bg-surface py-3.5"
        >
          {isFetchingNextPage ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-meta font-medio text-accent">Ver lo anterior</Text>
          )}
        </Pressable>
      ) : (
        <Text className="font-sans mt-5 text-center text-eyebrow text-tenue">
          Es todo lo que hay registrado.
        </Text>
      )}
    </ScrollView>
  );
}

/**
 * Dónde cae el punto: el `pt-2` de la entrada más media línea del título. Es un
 * número y no un centrado porque tiene que coincidir con el texto, no con la
 * caja.
 */
const ALTO_HASTA_EL_TITULO = 13;

/**
 * Una línea del hilo.
 *
 * El hilo vertical y el punto no son decoración: son lo que deja barrer la
 * lista de arriba abajo sin leer cada título. El color del punto dice de qué
 * familia es el hecho — y NO es la escala de gravedad, que en esta app
 * significa otra cosa.
 */
function Linea({
  evento,
  primero,
  ultimo,
}: {
  evento: Evento;
  primero: boolean;
  ultimo: boolean;
}) {
  const col = useColores();

  // La baja se distingue por FORMA —un anillo vacío— y no por color. El único
  // color libre que quedaba para «se sacó algo» era el naranja de atención, y
  // ese ya significa gravedad en toda la app: usarlo acá diría que suspender un
  // fármaco es una alerta de nivel medio, que es otra cosa.
  const marcas: Record<FamiliaEvento, { color: string; relleno: boolean }> = {
    tratamiento: { color: col.primary, relleno: true },
    paciente: { color: col.tenue, relleno: true },
    baja: { color: col.inkSuave, relleno: false },
  };
  const marca = marcas[familiaDe(evento.tipo)];

  return (
    <View className="flex-row">
      {/* Canal del hilo.
          El punto va a la altura del TÍTULO y no centrado en la entrada: si se
          centra, en una entrada alta —las que traen antes/después— el punto
          queda al lado de la tabla de cambios y deja de señalar el hecho. */}
      <View className="w-4 items-center">
        <View
          className="w-px"
          style={{ height: ALTO_HASTA_EL_TITULO, backgroundColor: primero ? 'transparent' : col.line }}
        />
        <View
          className="h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: marca.relleno ? marca.color : col.paper,
            borderWidth: marca.relleno ? 0 : 2,
            borderColor: marca.color,
          }}
        />
        <View
          className="w-px flex-1"
          style={{ backgroundColor: ultimo ? 'transparent' : col.line }}
        />
      </View>

      <View className="flex-1 pb-3 pl-3 pt-2">
        <Text className="text-meta font-medio text-ink">{evento.titulo}</Text>

        {evento.detalle ? (
          <Text className="font-sans mt-0.5 text-eyebrow leading-4 text-ink-suave">
            {evento.detalle}
          </Text>
        ) : null}

        {evento.cambios && evento.cambios.length > 0 ? (
          <Superficie elevacion="plana" className="mt-1.5 px-2.5 py-2">
            {evento.cambios.map((c, i) => (
              <FilaCambio key={`${c.campo}-${i}`} cambio={c} primera={i === 0} />
            ))}
          </Superficie>
        ) : null}

        <Text className="font-mono mt-1 text-eyebrow text-tenue">{hora(evento.createdAt)}</Text>
      </View>
    </View>
  );
}

/** «Creatinina · 1.1 mg/dL → 1.8 mg/dL», con el valor viejo tachado. */
function FilaCambio({ cambio, primera }: { cambio: CambioEvento; primera: boolean }) {
  const { campo, antes, despues } = leerCambio(cambio);

  return (
    <View className={primera ? '' : 'mt-1'}>
      <Text className="font-sans text-eyebrow leading-5 text-ink-suave">
        {campo}
        {'  '}
        {/* La flecha, y no sólo el tachado: dos números pegados se leen como
            dos datos, no como uno que cambió por el otro. */}
        {antes === null ? null : (
          <Text className="font-mono text-tenue">
            <Text className="line-through">{antes}</Text>
            {'  →  '}
          </Text>
        )}
        <Text className="font-mono-fuerte text-ink">{despues}</Text>
      </Text>
    </View>
  );
}
