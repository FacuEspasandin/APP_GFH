import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { CategoriaHallazgo, Cockpit, PrescripcionCockpit } from '@/api/tipos';
import * as API from '@/api/endpoints';
import { Skeleton } from '@/ui/estados-sistema';
import { antiguedad } from '@/ui/fecha';
import { BotonAvatar, EncabezadoApp } from '@/ui/encabezado-app';
import { Icono, type NombreIcono } from '@/ui/iconos';
import { AnilloClcr } from '@/ui/anillo-clcr';
import { etiquetaEmbarazo } from '@/dominio/gestacion';
import { rutaPaywall } from '@/dominio/plan-gratis';
import { esSintetica, nombreCondicion } from '@/ui/condiciones';
import { Superficie, SuperficieTocable } from '@/ui/superficie';
import { FilaAnimada } from '@/ui/animacion';
import { HojaInferior, OpcionHoja } from '@/ui/hoja-inferior';
import { Estado, Eyebrow, Pantalla } from '@/ui/kit';
import {
  destacados as hallazgosDestacados,
  hepaticoSinEvaluar,
  opcionesDelPaciente,
  peoresPorCategoria,
} from '@/dominio/cockpit';
import { Espina } from '@/ui/severidad';
import {
  claveColorPorClcr,
  claveColorPorRango,
  COLOR_SEVERIDAD,
  RANGO_ETIQUETA,
  type RangoGravedad,
} from '@gfh/shared-types';
import { useColores } from '@/ui/tema';

const NOMBRE_CATEGORIA: Record<CategoriaHallazgo, string> = {
  INTERACCION: 'Interacciones',
  CONDICION: 'Condiciones',
  AJUSTE_RENAL: 'Ajuste renal',
  AJUSTE_HEPATICO: 'Ajuste hepático',
};

const ICONO_CATEGORIA: Record<CategoriaHallazgo, NombreIcono> = {
  INTERACCION: 'interacciones',
  CONDICION: 'alerta',
  AJUSTE_RENAL: 'gota',
  AJUSTE_HEPATICO: 'higado',
};

/**
 * Cockpit de paciente (3.1.1).
 *
 * Abre con el veredicto: la app existe para contestar "¿es seguro este fármaco
 * para este paciente, hoy?" y antes esa respuesta había que armarla sumando
 * cuatro contadores. "1 interacción contraindicada" es la respuesta.
 *
 * Los dos hallazgos más graves se muestran acá; el resto se pide. Sigue siendo
 * deliberado no volcar los catorce: una pared de texto donde no se distingue lo
 * grave de lo informativo no ayuda. Pero tener que entrar a una categoría para
 * leer siquiera uno era el extremo contrario.
 */
export default function CockpitPaciente() {
  const col = useColores();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // Dos menús, dos verbos. El + crea cosas que no existían; los ··· tocan lo
  // que ya existe. Antes «Editar datos del paciente» vivía adentro del +,
  // que es justo lo que no hace.
  const [menu, setMenu] = useState<'ninguno' | 'agregar' | 'paciente'>('ninguno');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['cockpit', id],
    queryFn: () => API.cockpit(id),
    enabled: Boolean(id),
  });

  // La cabecera va afuera del `if`: antes vivía en `Stack.Screen`, que se
  // pinta sin importar el estado de la consulta. Devolverla recién en el
  // `return` final la hacía aparecer de golpe cuando el esqueleto terminaba.
  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: col.paper }}>
        <EncabezadoApp />
        <Skeleton />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View className="flex-1" style={{ backgroundColor: col.paper }}>
        <EncabezadoApp />
        <Pantalla>
          <Estado
            titulo="No se pudo cargar"
            detalle={error instanceof Error ? error.message : 'Error desconocido.'}
            accion="Reintentar"
            onAccion={() => void refetch()}
          />
        </Pantalla>
      </View>
    );
  }

  const p = data.paciente;
  const totalAvisos = data.avisos.length;

  /**
   * Sobre el paciente sintético no se escribe.
   *
   * Se mira entero —es el escaparate, y un muro sin escaparate no vende— pero
   * cualquier acción que lo toque abre el paywall. El backend lo rechaza igual;
   * hacerlo acá evita que el médico llene un formulario para que rebote.
   *
   * No hay excepciones. Los hallazgos salen de esta misma respuesta y podrían
   * abrirse sin pedirle nada al servidor, pero que cuatro toques funcionen y el
   * quinto mande a pagar se lee como que algo se rompió, no como un límite.
   */
  const abrir = (ruta: string) =>
    router.push((data.esDemostracion ? rutaPaywall('paciente') : ruta) as never);

  const destacados = hallazgosDestacados(data.hallazgos);

  const hepaticoNoEvaluable = hepaticoSinEvaluar(data.avisos);
  const peorPorCategoria = peoresPorCategoria(data.hallazgos);

  return (
    <View className="flex-1" style={{ backgroundColor: col.paper }}>
      <EncabezadoApp derecha={<BotonAvatar onPress={() => router.push('/(tabs)/perfil')} />} />

      {/* Deslizar para refrescar: el cockpit lo puede cambiar otra pantalla
          —cargar un análisis, aceptar una alternativa— y sin esto la única
          forma de volver a calcular era salir y entrar. */}
      <Pantalla onRefrescar={() => void refetch()} refrescando={isRefetching}>
        {/* ---------- Encabezado: nombre + agregar ---------- */}
        <View className="mb-4 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[32px] font-fuerte leading-10 text-ink">
              {p.nombre} {p.apellido}
            </Text>
            <Text className="mt-0.5 text-body text-ink-suave">{p.edadAnios} años</Text>
          </View>
          <Pressable
            onPress={() => setMenu('agregar')}
            accessibilityRole="button"
            accessibilityLabel="Agregar"
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: '#005228' }}
          >
            <Icono nombre="mas" tamano={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* ---------- 1. Datos del paciente ---------- */}
        {/* La única superficie con elevación alta de la pantalla: es el sujeto
            de todo lo demás, y la jerarquía la marca la profundidad y no el
            color —el color acá significa gravedad y no se gasta en decorar. */}
        <Superficie elevacion="alta" className="mb-5 p-4" style={{ position: 'relative' }}>
          {/* Los ··· van DENTRO de la tarjeta y no en la barra: lo que abren es
              de este paciente, y estando acá no hace falta rotularlo. Quedan
              cerca del + del header, así que se distinguen por peso — el + es
              un círculo relleno sobre el verde, esto es gris sobre el blanco
              de la tarjeta.

              Flotan sobre la esquina en vez de compartir renglón con el
              anillo: así el anillo arranca en el borde de arriba de la
              tarjeta, sin un renglón vacío empujándolo hacia abajo. */}
          <Pressable
            onPress={() => setMenu('paciente')}
            accessibilityRole="button"
            accessibilityLabel="Opciones del paciente"
            hitSlop={10}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ position: 'absolute', top: 4, right: 4, zIndex: 10 }}
          >
            <Icono nombre="mas-opciones" tamano={20} color={col.tenue} />
          </Pressable>

          <View className="flex-row items-center">
            {/* El Clcr manda: es el dato que condiciona casi todas las
                verificaciones, y en el anillo se ubica solo contra la escala. */}
            <AnilloClcr clcrMlMin={p.clcrMlMin} gradoKdigo={p.gradoKdigo} tamano={92} />
            <View className="ml-5 flex-1 gap-y-1.5 pr-8">
              <View className="flex-row items-center gap-1.5">
                <Icono
                  nombre="gota"
                  tamano={14}
                  color={p.clcrMlMin !== null ? COLOR_SEVERIDAD[claveColorPorClcr(p.clcrMlMin)] : col.tenue}
                />
                <Text
                  className="font-medio text-body"
                  style={{
                    color: p.clcrMlMin !== null ? COLOR_SEVERIDAD[claveColorPorClcr(p.clcrMlMin)] : col.ink,
                  }}
                >
                  Clcr Est.
                </Text>
              </View>
              {p.gradoKdigo ? (
                <View
                  className="self-start rounded-sm px-2 py-0.5"
                  style={{
                    backgroundColor:
                      p.clcrMlMin !== null
                        ? `${COLOR_SEVERIDAD[claveColorPorClcr(p.clcrMlMin)]}22`
                        : col.paper,
                  }}
                >
                  <Text
                    className="font-fuerte text-eyebrow uppercase tracking-wider"
                    style={{
                      color: p.clcrMlMin !== null ? COLOR_SEVERIDAD[claveColorPorClcr(p.clcrMlMin)] : col.tenue,
                    }}
                  >
                    KDIGO {p.gradoKdigo}
                  </Text>
                </View>
              ) : null}
              {/* La antigüedad al lado del origen. Un clearance calculado con
                  una creatinina de hace tres meses se leía igual que uno de
                  esta mañana: el backend estampaba la fecha de guardado, no la
                  del análisis. La app dice cuánto pasó y no si está vencido —
                  no hay umbral universal para eso. Este dato no está en el
                  render de Figma, pero es una decisión clínica de una pantalla
                  anterior que no correspondía perder por prolijidad visual. */}
              <Text className="text-eyebrow text-tenue">
                {etiquetaOrigen(p.clcrOrigen)}
                {p.clcrMedidoAt ? ` · ${antiguedad(p.clcrMedidoAt)}` : ''}
              </Text>
            </View>
          </View>

          {data.condicionesEfectivas.length > 0 ? (
            <Pressable
              onPress={() => abrir(`/paciente/${id}/condiciones-alergias`)}
              accessibilityRole="button"
              accessibilityLabel="Ver condiciones y alergias"
              className="mt-4 border-t border-line pt-3.5"
            >
              <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
                Condiciones Activas
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
              {data.condicionesEfectivas.map((c) => (
                <View
                  key={c}
                  className="rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor: esSintetica(c) ? 'transparent' : col.primaryLight,
                    borderWidth: esSintetica(c) ? 1 : 0,
                    borderColor: col.line,
                  }}
                >
                  {/* Las sintéticas van delineadas y no rellenas: el motor las
                      derivó, el médico no las cargó. Es una distinción que
                      importa si alguien revisa de dónde salió una alerta. */}
                  {/* La semana viaja con la condición: es el dato que decide
                      qué alertas de embarazo se están aplicando. */}
                  <Text className="text-eyebrow font-medio text-primary">
                    {c === 'EMBARAZO' ? etiquetaEmbarazo(p.semanaGestacion) : nombreCondicion(c)}
                  </Text>
                </View>
              ))}
              </View>
            </Pressable>
          ) : null}

        </Superficie>

        {/* ---------- 2. Lo más grave ---------- */}
        {destacados.length > 0 ? (
          <>
            <Eyebrow>Lo más grave</Eyebrow>
            <View className="mb-2 mt-1">
              {destacados.map((h) => (
                <SuperficieTocable
                  key={h.clave}
                  elevacion="plana"
                  onPress={() => abrir(`/paciente/${id}/hallazgos?categoria=${h.categoria}`)}
                  accesibilidad={`${h.titulo}, ${RANGO_ETIQUETA[h.rango]}`}
                  className="mb-2 flex-row items-center gap-3 py-3 pl-4 pr-3"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: COLOR_SEVERIDAD[claveColorPorRango(h.rango)],
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                  }}
                >
                  <View className="flex-1">
                    <Text className="text-body font-medio text-ink">{h.titulo}</Text>
                    <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">
                      {h.detalle}
                    </Text>
                  </View>
                  <Icono nombre="chevron" tamano={16} color={col.tenue} />
                </SuperficieTocable>
              ))}

              {data.hallazgos.length > destacados.length ? (
                <Pressable
                  onPress={() => abrir(`/paciente/${id}/hallazgos`)}
                  accessibilityRole="button"
                  className="items-center rounded-card border border-line bg-surface py-2.5"
                >
                  <Text className="font-medio text-meta text-primary">
                    Ver los {data.hallazgos.length} hallazgos
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View className="mb-3" />
          </>
        ) : null}

        {/* ---------- 3. Diagnóstico ---------- */}
        <Eyebrow>Por categoría</Eyebrow>
        {/* `justify-between` con ancho fijo, y NO `flex-1` con `flex-wrap`.
            En web las dos formas se ven igual, pero en el teléfono Yoga no
            calcula bien el alto de un contenedor que envuelve hijos con
            `flex: 1`: la segunda fila se dibujaba encima de la sección de
            abajo. Verificar sólo en el navegador no alcanzó para verlo. */}
        <View className="mb-5 flex-row flex-wrap justify-between gap-y-2">
          {(Object.keys(NOMBRE_CATEGORIA) as CategoriaHallazgo[]).map((cat) => {
            const n = data.dashboard[cat];
            const rangoCat = peorPorCategoria[cat] ?? null;
            const sinEvaluar = cat === 'AJUSTE_HEPATICO' && hepaticoNoEvaluable;
            const color = rangoCat !== null ? COLOR_SEVERIDAD[claveColorPorRango(rangoCat)] : null;
            return (
              // Las que tienen hallazgos se elevan; las que están en cero
              // quedan planas. Con cuatro tarjetas idénticas el ojo tiene que
              // leer los cuatro números para saber dónde mirar.
              <SuperficieTocable
                key={cat}
                elevacion={n > 0 ? 'media' : 'plana'}
                // El ancho va en `contenedor`: lo aplica el Pressable, que es
                // quien participa de la fila. En `className` se dimensionaría
                // el View interno y las cuatro saldrían del ancho de su texto.
                contenedor="w-[48.5%]"
                className="px-3.5 py-3.5"
                // La franja toma la gravedad del peor hallazgo de la categoría.
                // El número solo decía cuántos: tres informativos y tres
                // contraindicados se pintaban igual, porque el badge usa la
                // escala de CONTEO, que es otro eje.
                style={{
                  ...(color ? { borderLeftWidth: 4, borderLeftColor: color } : {}),
                  ...(n === 0 ? { opacity: 0.72 } : {}),
                }}
                onPress={() => abrir(`/paciente/${id}/hallazgos?categoria=${cat}`)}
                accesibilidad={
                  sinEvaluar
                    ? `${NOMBRE_CATEGORIA[cat]}, sin datos para evaluar`
                    : `${NOMBRE_CATEGORIA[cat]}, ${n} hallazgos${
                        rangoCat !== null ? `, lo peor es ${RANGO_ETIQUETA[rangoCat]}` : ''
                      }`
                }
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <Icono nombre={ICONO_CATEGORIA[cat]} tamano={18} color={color ?? col.tenue} />
                  {/* El número toma el color de la GRAVEDAD, no el del
                      conteo. Con la franja ya teñida por gravedad, un badge que
                      colorea por cantidad pintaba la misma tarjeta de dos
                      colores distintos: ajuste renal salía con franja naranja y
                      número rojo. Son dos escalas y no pueden convivir acá. */}
                  <View
                    className="h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: color ?? col.line }}
                  >
                    {sinEvaluar ? (
                      <Text className="font-fuerte text-eyebrow text-tenue">—</Text>
                    ) : (
                      <Text
                        className="font-medio text-eyebrow text-white"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {n}
                      </Text>
                    )}
                  </View>
                </View>
                <Text className="text-meta font-medio text-ink">{NOMBRE_CATEGORIA[cat]}</Text>
              </SuperficieTocable>
            );
          })}
        </View>

        {/* ---------- 3. Tratamiento activo ---------- */}
        <View className="mb-2 flex-row items-center justify-between">
          <Eyebrow>Tratamiento activo · {data.prescripciones.length}</Eyebrow>
          <Pressable
            onPress={() => abrir(`/paciente/${id}/cargar-tratamiento`)}
            accessibilityRole="button"
          >
            <Text className="mb-2 text-meta font-medio text-accent">Cargar tratamiento</Text>
          </Pressable>
        </View>

        {data.prescripciones.length === 0 ? (
          <Estado
            titulo="Sin medicación cargada"
            detalle="Agregá un fármaco para que se evalúe."
            accion="Agregar fármaco"
            onAccion={() => abrir(`/paciente/${id}/agregar-farmaco`)}
          />
        ) : (
          // Animadas porque esta lista se recalcula sola: suspender un fármaco
          // o aceptar una alternativa la reordena y cambia los contadores.
          data.prescripciones.map((pr, i) => (
            <FilaAnimada key={pr.id} indice={i}>
              <FilaTratamiento
                prescripcion={pr}
                onPress={() => abrir(`/paciente/${id}/hallazgos?prescripcion=${pr.id}`)}
              />
            </FilaAnimada>
          ))
        )}

        {totalAvisos > 0 ? (
          <Pressable
            onPress={() => abrir(`/paciente/${id}/hallazgos?avisos=1`)}
            accessibilityRole="button"
            className="mt-3 flex-row items-center rounded-card border border-line bg-surface px-3.5 py-3"
            style={{ borderLeftWidth: 4, borderLeftColor: COLOR_SEVERIDAD.neutro }}
          >
            <Text className="font-sans flex-1 text-meta text-ink">
              {totalAvisos} {totalAvisos === 1 ? 'dato faltante' : 'datos faltantes'}
            </Text>
            <Text className="text-meta font-medio text-accent">Ver</Text>
          </Pressable>
        ) : null}
      </Pantalla>

      {/* El + : sólo lo que crea un registro nuevo (3.1.5) */}
      <HojaInferior visible={menu === 'agregar'} onCerrar={() => setMenu('ninguno')}>
        {[
          ['Agregar fármaco', `/paciente/${id}/agregar-farmaco`],
          ['Agregar condición', `/paciente/${id}/agregar-condicion`],
          ['Agregar alergia', `/paciente/${id}/agregar-alergia`],
        ].map(([titulo, ruta]) => (
          <OpcionHoja
            key={ruta}
            titulo={titulo!}
            onPress={() => {
              setMenu('ninguno');
              abrir(ruta!);
            }}
          />
        ))}
      </HojaInferior>

      {/* Los ··· : lo que ya existe. Las tres pantallas de datos clínicos van
          juntas porque se usan juntas, y el historial cierra la lista. */}
      <HojaInferior visible={menu === 'paciente'} onCerrar={() => setMenu('ninguno')}>
        {/* Cada opción dice qué hay cargado antes de abrirla: así se ve de un
            vistazo qué le falta al paciente sin entrar a las cuatro. */}
        {opcionesDelPaciente(id!, p).map((o) => (
          <OpcionHoja
            key={o.ruta}
            titulo={o.titulo}
            detalle={o.detalle}
            icono={o.icono}
            onPress={() => {
              setMenu('ninguno');
              abrir(o.ruta);
            }}
          />
        ))}
      </HojaInferior>
    </View>
  );
}

/**
 * De dónde salió el Clcr. Importa clínicamente: un valor medido en laboratorio
 * y uno estimado por Cockcroft-Gault no se leen igual, y el segundo depende de
 * un peso que puede estar desactualizado.
 */
function etiquetaOrigen(origen: string | null): string {
  if (origen === 'MEDIDO') return 'Medido';
  if (origen === 'CALCULADO_COCKCROFT') return 'Calculado';
  return 'Sin dato';
}

function FilaTratamiento({
  prescripcion,
  onPress,
}: {
  prescripcion: PrescripcionCockpit;
  onPress: () => void;
}) {
  const col = useColores();
  // Con hallazgos se eleva, sin hallazgos queda plano. El fármaco tranquilo no
  // tiene que competir por atención con el que tiene una interacción grave.
  const conHallazgos = prescripcion.conteoHallazgos > 0;

  const rango = prescripcion.espina as RangoGravedad | null;
  const color = rango !== null ? COLOR_SEVERIDAD[claveColorPorRango(rango)] : null;

  return (
    <SuperficieTocable
      onPress={onPress}
      elevacion={conHallazgos ? 'media' : 'plana'}
      className="mb-2.5 flex-row items-stretch"
      accesibilidad={`${prescripcion.nombre}, ${prescripcion.conteoHallazgos} hallazgos`}
    >
      <Espina rango={rango} />
      <View className="flex-1 flex-row items-center px-3.5 py-3.5">
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-fila font-medio text-ink">{prescripcion.nombre}</Text>
            {/* La palabra de severidad, no el conteo: acá el rediseño de Figma
                cambia qué información se prioriza en el vistazo — antes era
                "cuántos hallazgos tiene este fármaco" (`BadgeConteo`), ahora es
                "qué tan grave es lo peor que tiene". El conteo por fármaco
                sigue disponible entrando a "Ver hallazgos"; se pierde del
                vistazo de esta fila a propósito, siguiendo el frame. */}
            {rango !== null ? (
              <View className="rounded-sm px-2 py-0.5" style={{ backgroundColor: color! }}>
                <Text className="font-fuerte text-[11px] uppercase tracking-wider text-white">
                  {RANGO_ETIQUETA[rango]}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="font-sans mt-1 text-meta text-ink-suave">
            {/* La pauta en mono: son cifras, y alineadas se comparan de un
                vistazo entre filas. */}
            <Text className="font-mono">{prescripcion.dosis}</Text>
            {' · '}
            {prescripcion.frecuencia}
          </Text>
          {prescripcion.esFarmacoLibre ? (
            <View className="mt-1.5 self-start rounded-chip bg-paper px-2 py-0.5">
              <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
                No se verifica
              </Text>
            </View>
          ) : null}
        </View>
        <Icono nombre="mas-opciones" tamano={16} color={col.tenue} />
      </View>
    </SuperficieTocable>
  );
}

