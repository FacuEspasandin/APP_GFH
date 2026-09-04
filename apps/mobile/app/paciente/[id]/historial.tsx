import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { BotonAvatar, EncabezadoApp } from '@/ui/encabezado-app';
import { SkeletonLista } from '@/ui/estados-sistema';
import { Icono, type NombreIcono } from '@/ui/iconos';
import { Chip, Estado, Pantalla } from '@/ui/kit';
import {
  NOMBRE_GRUPO,
  ORDEN_GRUPOS,
  ORDEN_PERIODOS,
  PERIODOS,
  type GrupoDeEvento,
  type Periodo,
} from '@gfh/shared-types';
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
  const router = useRouter();
  const derecha = <BotonAvatar onPress={() => router.push('/(tabs)/perfil')} />;

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

  if (isLoading) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoApp derecha={derecha} />
        <SkeletonLista filas={6} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoApp derecha={derecha} />
        <Pantalla>
          <Estado
            titulo="No se pudo cargar el historial"
            detalle={error instanceof Error ? error.message : 'Error desconocido.'}
            accion="Reintentar"
            onAccion={() => void refetch()}
          />
        </Pantalla>
      </View>
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
      <View className="flex-1 bg-paper">
        <EncabezadoApp derecha={derecha} />
        <Pantalla>
          <Estado titulo="Sin movimientos" detalle={MOTIVO_DE_VACIO} />
        </Pantalla>
      </View>
    );
  }

  return (
    // Mismo padding que `Pantalla`: la barra inferior ocupa su propio espacio
    // en el layout raíz, no flota encima, así que no hay que reservarle nada.
    <View className="flex-1 bg-paper">
      <EncabezadoApp derecha={derecha} />
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
 * Diámetro del punto del hilo y su ícono interior.
 *
 * Antes era un punto de 10px sin ícono — antes/después de la propuesta visual
 * de Figma (ver PR de rediseño), pasa a ser un círculo de 24px con un ícono
 * adentro, para que la familia del hecho se lea sin acercarse a leer el
 * título. El hilo que conecta un punto con el siguiente lo mantenemos: la
 * captura de Figma no lo dibuja, pero es lo que permite barrer la lista sin
 * leer cada tarjeta (razón ya validada en este archivo), y sacarlo sería
 * perder una función real por copiar un único frame estático.
 */
const DIAMETRO_PUNTO = 24;

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

/**
 * Ícono y color por familia.
 *
 * El verde NO es el verde de severidad «ok» (`#22C55E`) aunque el primer
 * render de Figma usaba ese tono — acá significaría «este fármaco no tiene
 * problemas», que es otra escala. Es el verde de marca nuevo, así queda
 * separado de la severidad clínica igual que antes (ver comentario que
 * reemplaza este).
 */
const MARCA: Record<FamiliaEvento, { color: string; relleno: boolean; icono: NombreIcono | null }> = {
  tratamiento: { color: '#006D37', relleno: true, icono: 'check' },
  paciente: { color: '#8CA39A', relleno: true, icono: 'documento' },
  baja: { color: '#BECABD', relleno: false, icono: null },
};

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
  const familia = familiaDe(evento.tipo);
  const marca = MARCA[familia];
  const esBaja = familia === 'baja';

  return (
    <View className="flex-row pb-4">
      {/* Canal del hilo: el punto arranca a 4px del techo de la fila, a la
          misma altura que el borde superior de la tarjeta — no centrado en el
          título como antes, porque ahora la tarjeta tiene su propio
          encabezado con hora, y centrar el punto en toda la tarjeta lo
          alejaría del título en las entradas con tabla de cambios. */}
      <View style={{ width: DIAMETRO_PUNTO, alignItems: 'center' }}>
        <View
          className="w-px"
          style={{ height: 4, backgroundColor: primero ? 'transparent' : col.line }}
        />
        <View
          style={{
            width: DIAMETRO_PUNTO,
            height: DIAMETRO_PUNTO,
            borderRadius: DIAMETRO_PUNTO / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: marca.relleno ? marca.color : col.surface,
            borderWidth: 2,
            borderColor: marca.relleno ? col.surface : marca.color,
          }}
        >
          {marca.icono ? (
            <Icono nombre={marca.icono} tamano={12} color={marca.relleno ? '#FFFFFF' : marca.color} />
          ) : null}
        </View>
        <View className="w-px flex-1" style={{ backgroundColor: ultimo ? 'transparent' : col.line }} />
      </View>

      <View
        className="ml-3 flex-1 rounded-lg border px-4 py-3.5"
        style={{
          backgroundColor: col.surface,
          borderColor: col.line,
          opacity: esBaja ? 0.75 : 1,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: esBaja ? 0 : 1,
        }}
      >
        <View className="flex-row items-start justify-between gap-2">
          <Text
            className="flex-1 text-fila font-fuerte text-ink"
            style={esBaja ? { textDecorationLine: 'line-through' } : undefined}
          >
            {evento.titulo}
          </Text>
          <Text className="font-mono text-eyebrow text-ink-suave">{hora(evento.createdAt)}</Text>
        </View>

        {evento.detalle ? (
          <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">{evento.detalle}</Text>
        ) : null}

        {evento.cambios && evento.cambios.length > 0 ? (
          <TablaCambios cambios={evento.cambios} />
        ) : null}
      </View>
    </View>
  );
}

/**
 * Los cambios como tabla (Campo / Antes / Después), no como líneas sueltas.
 *
 * Con un solo cambio es una tabla de una fila — se ve un poco solemne para
 * «Peso: 78 kg → 81 kg», pero gana consistencia: es la MISMA tarjeta la que
 * trae dos cambios (renal) que la que trae uno (peso), sin que la forma
 * cambie según cuántos datos vinieron.
 */
function TablaCambios({ cambios }: { cambios: CambioEvento[] }) {
  const col = useColores();

  return (
    <View className="mt-2.5 overflow-hidden rounded-md border" style={{ borderColor: col.line }}>
      <View
        className="flex-row border-b px-2.5 py-2"
        style={{ backgroundColor: col.paper, borderColor: col.line }}
      >
        <Text
          className="font-fuerte uppercase tracking-wider text-ink-suave"
          style={{ flex: 1.3, fontSize: 10 }}
        >
          Campo
        </Text>
        <Text className="font-fuerte uppercase tracking-wider text-ink-suave" style={{ flex: 1, fontSize: 10 }}>
          Antes
        </Text>
        <Text className="font-fuerte uppercase tracking-wider text-ink-suave" style={{ flex: 1, fontSize: 10 }}>
          Después
        </Text>
      </View>

      {cambios.map((c, i) => {
        const { campo, antes, despues } = leerCambio(c);
        return (
          <View
            key={`${campo}-${i}`}
            className="flex-row items-center px-2.5 py-2"
            style={i < cambios.length - 1 ? { borderBottomWidth: 1, borderColor: col.line } : undefined}
          >
            <Text className="font-sans text-eyebrow text-ink" style={{ flex: 1.3 }}>
              {campo}
            </Text>
            <Text className="font-mono text-eyebrow text-tenue line-through" style={{ flex: 1 }}>
              {antes ?? '—'}
            </Text>
            <Text className="font-mono-fuerte text-eyebrow text-ink" style={{ flex: 1 }}>
              {despues}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
