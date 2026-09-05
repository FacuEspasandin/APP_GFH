import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';

import type { Cockpit, Hallazgo } from '@/api/tipos';
import * as API from '@/api/endpoints';
import {
  agruparHallazgos,
  descripcionDeVista,
  filtrarAvisos,
  filtrarHallazgos,
  mensajeVacio,
  TITULO_CATEGORIA,
  tituloDeVista,
  vistaDesdeParams,
  type FilaAgrupada,
} from '@/dominio/hallazgos';
import { BotonAvatar, EncabezadoApp } from '@/ui/encabezado-app';
import { SkeletonLista } from '@/ui/estados-sistema';
import { Icono } from '@/ui/iconos';
import { Estado, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { ChipSeveridad, Espina } from '@/ui/severidad';
import {
  CATEGORIA_HALLAZGO,
  claveColorPorRango,
  colorEspina,
  COLOR_SEVERIDAD,
  viaLegible,
  type CategoriaHallazgo,
  type RangoGravedad,
} from '@gfh/shared-types';
import { useColores } from '@/ui/tema';

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
    queryFn: () => API.cockpit(id),
    enabled: Boolean(id),
  });

  const derecha = <BotonAvatar onPress={() => router.push('/(tabs)/perfil')} />;

  if (isLoading) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoApp derecha={derecha} />
        <SkeletonLista filas={4} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoApp derecha={derecha} />
        <Pantalla>
          <Estado titulo="No se pudo cargar" detalle={String((error as Error)?.message ?? '')} />
        </Pantalla>
      </View>
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

  /*
   * Entrando por una categoría, las cuatro se pueden deslizar.
   *
   * Antes, ver otra verificación del mismo paciente era volver al cockpit y
   * tocar otra tarjeta. Comparar interacciones contra ajuste renal —que es lo
   * que se hace cuando algo no cierra— eran cuatro toques.
   *
   * Sólo en esta vista. Por fármaco, por avisos y en «todos» no hay entre qué
   * deslizar, y un gesto que a veces hace algo y a veces no se siente roto.
   */
  if (vista.tipo === 'categoria') {
    return (
      <PorCategoria
        pacienteId={id!}
        inicial={vista.categoria}
        data={data}
        nombres={nombres}
        onAlternativas={(pid) =>
          router.push(`/paciente/${id}/alternativas?prescripcion=${pid}` as never)
        }
      />
    );
  }

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoApp derecha={derecha} />
      <ScrollView contentContainerClassName="px-4 pb-6 pt-3" keyboardShouldPersistTaps="handled">
        <Text className="text-fila font-fuerte text-ink">{titulo}</Text>
        <Text className="mb-4 mt-1 font-sans text-meta leading-5 text-ink-suave">
          {descripcionDeVista(vista)}
        </Text>

        <AlertaCriticaHallazgos lista={lista} />

      {prescripcionActual ? (
        <View className="mb-4 rounded-card border border-line bg-surface px-3.5 py-3">
          <Text className="text-body font-medio text-ink">{prescripcionActual.nombre}</Text>
          <Text className="font-sans mt-0.5 text-meta text-ink-suave">
            {[
              prescripcionActual.dosis,
              prescripcionActual.frecuencia,
              /* `viaLegible` devuelve null en NO_ESPECIFICADA y el filtro la
                 saca: antes salía «vía no_especificada», con guión bajo, que es
                 el enum crudo pasado a minúsculas. */
              viaLegible(prescripcionActual.via),
            ]
              .filter(Boolean)
              .join(' · ')}
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

      {agruparHallazgos(lista).map((f) => (
        <FilaHallazgo
          key={f.tipo === 'grupo' ? f.clave : f.hallazgo.clave}
          fila={f}
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
      </ScrollView>
    </View>
  );
}

/**
 * Las cuatro verificaciones, deslizables.
 *
 * Los chips de arriba no son decoración: sin ellos el gesto es invisible.
 * Además llevan el conteo y el color del peor hallazgo de cada categoría, que
 * es lo que decide a cuál moverse — y esa es información que en el cockpit ya
 * está, así que repetirla acá no obliga a volver para saberlo.
 */
function PorCategoria({
  pacienteId,
  inicial,
  data,
  nombres,
  onAlternativas,
}: {
  pacienteId: string;
  inicial: CategoriaHallazgo;
  data: Cockpit;
  nombres: Map<string, string>;
  onAlternativas: (pid: string) => void;
}) {
  const col = useColores();
  const router = useRouter();
  const pager = useRef<PagerView>(null);
  const arranque = Math.max(0, CATEGORIA_HALLAZGO.indexOf(inicial));
  const [actual, setActual] = useState(arranque);

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoApp derecha={<BotonAvatar onPress={() => router.push('/(tabs)/perfil')} />} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4 py-3"
        className="flex-none border-b border-line bg-surface"
      >
        {CATEGORIA_HALLAZGO.map((cat, i) => {
          const suyos = data.hallazgos.filter((h) => h.categoria === cat);
          const peor = suyos.reduce<RangoGravedad | null>(
            (p, h) => (p === null || h.rango < p ? h.rango : p),
            null,
          );
          const activo = i === actual;
          const color = peor !== null ? COLOR_SEVERIDAD[claveColorPorRango(peor)] : null;

          return (
            <Pressable
              key={cat}
              // `setPage` y no `setState`: mover el pager dispara
              // `onPageSelected`, así el chip y la página nunca se
              // desincronizan. Actualizar los dos por separado sí puede.
              onPress={() => pager.current?.setPage(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`${TITULO_CATEGORIA[cat]}, ${suyos.length} hallazgos`}
              className="flex-row items-center rounded-chip border px-3 py-1.5"
              style={{
                borderColor: activo ? col.primary : col.line,
                backgroundColor: activo ? col.primaryLight : 'transparent',
                ...(color ? { borderLeftWidth: 3, borderLeftColor: color } : {}),
              }}
            >
              <Text
                className={activo ? 'text-meta font-medio' : 'font-sans text-meta'}
                style={{ color: activo ? col.primary : col.inkSuave }}
              >
                {TITULO_CATEGORIA[cat]}
              </Text>
              {suyos.length > 0 ? (
                <Text
                  className="font-mono-fuerte ml-1.5 text-eyebrow"
                  style={{ color: activo ? col.primary : col.inkSuave }}
                >
                  {suyos.length}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <PagerView
        ref={pager}
        style={{ flex: 1 }}
        initialPage={arranque}
        onPageSelected={(e) => setActual(e.nativeEvent.position)}
      >
        {CATEGORIA_HALLAZGO.map((cat) => {
          const suVista = { tipo: 'categoria', categoria: cat } as const;
          const lista = filtrarHallazgos(suVista, data.hallazgos);
          const avisos = filtrarAvisos(suVista, data.avisos);

          return (
            <View key={cat} collapsable={false}>
              <ScrollView contentContainerClassName="px-4 pb-6 pt-3">
                <Text className="text-fila font-fuerte text-ink">{TITULO_CATEGORIA[cat]}</Text>
                <Text className="mb-4 mt-1 font-sans text-meta leading-5 text-ink-suave">
                  {descripcionDeVista(suVista)}
                </Text>

                <AlertaCriticaHallazgos lista={lista} />

                {lista.length === 0 && avisos.length === 0 ? (
                  <View
                    className="rounded-card border border-line bg-surface px-3.5 py-3"
                    style={{ borderLeftWidth: 4, borderLeftColor: COLOR_SEVERIDAD.ok }}
                  >
                    <Text className="font-sans text-meta text-ink">{mensajeVacio(suVista)}</Text>
                  </View>
                ) : null}

                {agruparHallazgos(lista).map((f) => (
                  <FilaHallazgo
                    key={f.tipo === 'grupo' ? f.clave : f.hallazgo.clave}
                    fila={f}
                    nombres={nombres}
                    onAlternativas={onAlternativas}
                  />
                ))}

                {avisos.map((a) => (
                  <View
                    key={a.codigo + (a.prescripcionId ?? '')}
                    className="mb-2 rounded-card border border-line bg-surface px-3.5 py-3"
                    style={{ borderLeftWidth: 4, borderLeftColor: COLOR_SEVERIDAD.neutro }}
                  >
                    <Text className="font-sans text-meta leading-5 text-ink">{a.detalle}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </PagerView>
    </View>
  );
}

/** Solo se eleva si hay algo contraindicado en la lista que se está viendo. */
function AlertaCriticaHallazgos({ lista }: { lista: readonly Hallazgo[] }) {
  const graves = lista.filter((h) => h.rango === 0);
  if (graves.length === 0) return null;
  const [primero, ...resto] = graves;

  return (
    <View
      className="mb-4 flex-row gap-4 rounded-2xl p-4"
      style={{ backgroundColor: '#FFDAD6', borderWidth: 1, borderColor: 'rgba(186,26,26,0.2)' }}
    >
      <Icono nombre="alerta" tamano={20} color="#93000A" />
      <View className="flex-1">
        <Text className="text-fila font-fuerte" style={{ color: '#93000A' }}>
          {primero!.titulo}
        </Text>
        <Text className="mt-1 text-meta leading-5" style={{ color: 'rgba(147,0,10,0.9)' }}>
          {resto.length > 0 ? `Contraindicado. Y ${resto.length} más abajo.` : 'Contraindicado.'}
        </Text>
      </View>
    </View>
  );
}

/** Despacha entre una tarjeta suelta y un grupo por tipo de riesgo — es lo
 *  único que cambia entre las dos listas de arriba. */
function FilaHallazgo({
  fila,
  nombres,
  onAlternativas,
}: {
  fila: FilaAgrupada<Hallazgo>;
  nombres: Map<string, string>;
  onAlternativas: (prescripcionId: string) => void;
}) {
  if (fila.tipo === 'individual') {
    return <Tarjeta hallazgo={fila.hallazgo} nombres={nombres} onAlternativas={onAlternativas} />;
  }
  return (
    <TarjetaGrupoRiesgo grupo={fila} nombres={nombres} onAlternativas={onAlternativas} />
  );
}

/**
 * Varios hallazgos, un mismo riesgo — colapsados a una tarjeta hasta que el
 * médico la abre. Dos casos: interacciones que comparten mecanismo clínico
 * (motor §9 addendum), o condiciones/alergias donde varios fármacos alertan
 * sobre la misma condición.
 *
 * Agrupar no oculta nada: cada hallazgo de adentro es la misma `Tarjeta`
 * completa que se vería suelta, con su severidad, su texto y su acceso a
 * alternativas. Lo único que cambia es que no hay que leer las N de una para
 * darse cuenta de que es el mismo riesgo contado varias veces.
 */
function TarjetaGrupoRiesgo({
  grupo,
  nombres,
  onAlternativas,
}: {
  grupo: Extract<FilaAgrupada<Hallazgo>, { tipo: 'grupo' }>;
  nombres: Map<string, string>;
  onAlternativas: (prescripcionId: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const color = colorEspina(grupo.peor);

  return (
    <View className="mb-2.5">
      <Pressable
        onPress={() => setAbierto((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={`${grupo.etiqueta}, ${grupo.hallazgos.length} hallazgos`}
      >
        <Superficie elevacion={grupo.peor <= 1 ? 'media' : 'plana'} className="flex-row items-stretch">
          <Espina rango={grupo.peor} />
          <View className="flex-1 flex-row items-center justify-between gap-2 px-3.5 py-3.5">
            <View className="flex-1">
              <Text className="text-fila font-medio text-ink">{grupo.etiqueta}</Text>
              <Text className="font-sans mt-0.5 text-meta text-ink-suave">
                {grupo.hallazgos.length} hallazgos
              </Text>
            </View>
            <ChipSeveridad rango={grupo.peor} />
            <Icono
              nombre={abierto ? 'chevronArriba' : 'chevron'}
              tamano={15}
              color={color}
            />
          </View>
        </Superficie>
      </Pressable>

      {abierto ? (
        <View className="ml-2 mt-2 gap-2.5 border-l-2 pl-2.5" style={{ borderLeftColor: color }}>
          {grupo.hallazgos.map((h) => (
            <Tarjeta key={h.clave} hallazgo={h} nombres={nombres} onAlternativas={onAlternativas} />
          ))}
        </View>
      ) : null}
    </View>
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
              <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
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
