import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import * as API from '@/api/endpoints';
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
import { SkeletonLista } from '@/ui/estados-sistema';
import { Chip, Estado, Pantalla } from '@/ui/kit';
import {
  NOMBRE_GRUPO,
  ORDEN_GRUPOS,
  ORDEN_PERIODOS,
  PERIODOS,
  type GrupoDeEvento,
  type Periodo,
} from '@gfh/shared-types';
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

  /**
   * `null` = sin filtrar. Es el estado de arranque a propósito: el historial se
   * abre para ver qué pasó, no para buscar algo puntual, y arrancar con un
   * filtro puesto escondería cosas sin que nadie lo haya pedido.
   */
  const [grupo, setGrupo] = useState<GrupoDeEvento | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('todo');

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      // Los filtros van en la clave: cambiarlos es otra consulta, no la misma
      // filtrada. Sin esto react-query serviría las páginas del filtro anterior
      // mientras llega la primera del nuevo.
      queryKey: ['historial', pacienteId, grupo, periodo],
      // El cursor es la fecha del último evento que ya tenemos, no un número de
      // página: la lista crece por arriba y con `skip` se repetirían filas.
      queryFn: ({ pageParam }) =>
        API.historial<Historial>(pacienteId, {
          antesDe: pageParam || undefined,
          grupo: grupo ?? undefined,
          periodo,
        }),
      initialPageParam: '' as string,
      getNextPageParam: (ultima) =>
        ultima.hayMas && ultima.eventos.length > 0
          ? ultima.eventos[ultima.eventos.length - 1]!.createdAt
          : undefined,
      enabled: Boolean(pacienteId),
    });

  if (isLoading) return <SkeletonLista filas={6} />;

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

  /*
   * Los días agrupados se aplanan a una sola lista de filas.
   *
   * `FlashList` recicla filas, y para eso necesita una lista plana: con
   * `map` anidados se montaría todo el historial en memoria, que es
   * justamente lo que hay que evitar cuando son cientos de eventos.
   *
   * El encabezado del día viaja como una fila más, con su propio tipo. Así el
   * reciclador sabe que no es intercambiable con un evento y no reusa la vista
   * equivocada.
   */
  const filas: Fila[] = dias.flatMap((dia) => [
    { tipo: 'dia' as const, clave: dia.clave, titulo: dia.titulo },
    ...dia.eventos.map((e, i) => ({
      tipo: 'evento' as const,
      clave: e.id,
      evento: e,
      primero: i === 0,
      ultimo: i === dia.eventos.length - 1 && dia === dias[dias.length - 1],
    })),
  ]);

  if (eventos.length === 0) {
    return (
      <Pantalla>
        <Estado titulo="Sin movimientos" detalle={MOTIVO_DE_VACIO} />
      </Pantalla>
    );
  }

  return (
    // Mismo padding que `Pantalla`: la barra inferior ocupa su propio espacio
    // en el layout raíz, no flota encima, así que no hay que reservarle nada.
    <View className="flex-1 bg-paper">
      <Filtros
        grupo={grupo}
        periodo={periodo}
        onGrupo={setGrupo}
        onPeriodo={setPeriodo}
      />

      <FlashList
        data={filas}
        keyExtractor={(f) => f.clave}
        getItemType={(f) => f.tipo}
        contentContainerClassName="px-4 pb-6 pt-3"
        /*
         * Pide la página siguiente al acercarse al final, en vez del botón
         * «Ver lo anterior». Un historial se recorre hacia atrás de corrido:
         * tener que tocar cada cincuenta líneas interrumpe justo lo que se
         * estaba haciendo.
         */
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        renderItem={({ item }) =>
          item.tipo === 'dia' ? (
            <Text className="font-mono-fuerte mb-1 mt-3 text-eyebrow uppercase tracking-wider text-ink-suave">
              {item.titulo}
            </Text>
          ) : (
            <Linea evento={item.evento} primero={item.primero} ultimo={item.ultimo} />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-5">
              <ActivityIndicator />
            </View>
          ) : hasNextPage ? null : (
            <Text className="font-sans mt-5 text-center text-eyebrow text-tenue">
              Es todo lo que hay registrado.
            </Text>
          )
        }
      />
    </View>
  );
}

/**
 * Una fila de la lista aplanada.
 *
 * El encabezado de día y el evento son tipos distintos a propósito: se lo
 * decimos a `FlashList` con `getItemType` para que no recicle una vista de
 * título como si fuera un evento.
 */
type Fila =
  | { tipo: 'dia'; clave: string; titulo: string }
  | {
      tipo: 'evento';
      clave: string;
      evento: Parameters<typeof Linea>[0]['evento'];
      primero: boolean;
      ultimo: boolean;
    };

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
/**
 * Los filtros: qué pasó y desde cuándo.
 *
 * Dos filas y no un panel que se despliega: son seis chips en total, y
 * esconderlos detrás de un botón «filtrar» agrega un toque para llegar a algo
 * que entra en pantalla.
 *
 * **No hay filtro por fármaco**, que era la tercera idea. El evento guarda el
 * texto escrito en el momento y no una referencia al fármaco —a propósito, para
 * que borrar uno no deje la línea en blanco— así que filtrar por fármaco sería
 * buscar por texto, y eso falla raro: «Ibuprofeno 400» no encontraría la línea
 * que dice «Ibuprofeno». Prometer una búsqueda que a veces no encuentra lo que
 * está es peor que no ofrecerla.
 */
function Filtros({
  grupo,
  periodo,
  onGrupo,
  onPeriodo,
}: {
  grupo: GrupoDeEvento | null;
  periodo: Periodo;
  onGrupo: (g: GrupoDeEvento | null) => void;
  onPeriodo: (p: Periodo) => void;
}) {
  return (
    <View className="flex-none border-b border-line bg-surface">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4 pt-3 pb-2"
      >
        {/* «Todo» primero y activo por defecto: el historial se abre para ver
            qué pasó, no para buscar algo puntual. */}
        <Chip texto="Todo" activo={grupo === null} onPress={() => onGrupo(null)} />
        {ORDEN_GRUPOS.map((g) => (
          <Chip
            key={g}
            texto={NOMBRE_GRUPO[g]}
            activo={grupo === g}
            // Tocar el que ya está puesto lo saca. Sin esto haría falta ir a
            // «Todo» para volver, que es un toque de más por una idea que el
            // médico ya descartó.
            onPress={() => onGrupo(grupo === g ? null : g)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4 pb-3"
      >
        {ORDEN_PERIODOS.map((p) => (
          <Chip
            key={p}
            texto={PERIODOS[p].nombre}
            activo={periodo === p}
            onPress={() => onPeriodo(p)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

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
