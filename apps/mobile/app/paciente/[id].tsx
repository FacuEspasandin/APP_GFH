import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { CategoriaHallazgo, Cockpit, PrescripcionCockpit } from '@/api/tipos';
import { Icono } from '@/ui/iconos';
import { AnilloClcr } from '@/ui/anillo-clcr';
import { esSintetica, nombreCondicion } from '@/ui/condiciones';
import { Superficie, SuperficieTocable } from '@/ui/superficie';
import { FilaAnimada } from '@/ui/animacion';
import { HojaInferior, OpcionHoja } from '@/ui/hoja-inferior';
import { Cargando, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { Veredicto } from '@/ui/herramienta';
import { BadgeConteo, Espina } from '@/ui/severidad';
import {
  claveColorPorRango,
  COLOR_SEVERIDAD,
  nombreSexo,
  peorRango,
  RANGO_ETIQUETA,
  type RangoGravedad,
  type Sexo,
} from '@gfh/shared-types';
import { useColores } from '@/ui/tema';

const NOMBRE_CATEGORIA: Record<CategoriaHallazgo, string> = {
  INTERACCION: 'Interacciones',
  CONDICION: 'Condiciones',
  AJUSTE_RENAL: 'Ajuste renal',
  AJUSTE_HEPATICO: 'Ajuste hepático',
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
  const [menuAbierto, setMenuAbierto] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cockpit', id],
    queryFn: () => api.get<Cockpit>(`/pacientes/${id}/cockpit`),
    enabled: Boolean(id),
  });

  if (isLoading) return <Cargando />;
  if (error || !data) {
    return (
      <Pantalla>
        <Estado
          titulo="No se pudo cargar"
          detalle={error instanceof Error ? error.message : 'Error desconocido.'}
          accion="Reintentar"
          onAccion={() => void refetch()}
        />
      </Pantalla>
    );
  }

  const p = data.paciente;
  const totalAvisos = data.avisos.length;

  const peor = peorRango(data.hallazgos.map((h) => h.rango));

  // Los dos peores, y sólo si hay algo que mirar. Ordenar por rango y cortar es
  // suficiente: dentro de la misma gravedad da igual cuál va primero.
  const destacados = [...data.hallazgos].sort((a, b) => a.rango - b.rango).slice(0, 2);

  // El ajuste hepático no tiene tabla contra la cual evaluar, y el motor lo
  // dice con este aviso. Mostrar "0" ahí afirmaría que se miró y no había nada
  // — que es justo lo que la regla 5 prohíbe.
  const hepaticoNoEvaluable = data.avisos.some((a) => a.codigo === 'SIN_CHILD_PUGH');

  const peorPorCategoria = peoresPorCategoria(data.hallazgos);

  return (
    <>
      <Stack.Screen
        options={{
          title: `${p.apellido}, ${p.nombre}`,
          headerRight: () => (
            <Pressable
              onPress={() => setMenuAbierto(true)}
              accessibilityRole="button"
              accessibilityLabel="Agregar"
              className="mr-3 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Icono nombre="mas" tamano={18} color="#FFFFFF" />
            </Pressable>
          ),
        }}
      />

      <Pantalla>
        {/* ---------- 0. Veredicto ---------- */}
        <Veredicto
          rango={peor}
          titulo={titularCockpit(peor, data.hallazgos)}
          detalle={detalleCockpit(data.hallazgos)}
        />

        {/* ---------- 1. Datos del paciente ---------- */}
        {/* La única superficie con elevación alta de la pantalla: es el sujeto
            de todo lo demás, y la jerarquía la marca la profundidad y no el
            color —el color acá significa gravedad y no se gasta en decorar. */}
        <Superficie elevacion="alta" className="mb-5 p-4">
          <View className="flex-row items-center">
            {/* El Clcr manda: es el dato que condiciona casi todas las
                verificaciones, y en el anillo se ubica solo contra la escala. */}
            <AnilloClcr clcrMlMin={p.clcrMlMin} gradoKdigo={p.gradoKdigo} />
            <View className="ml-4 flex-1 gap-y-3">
              <Dato etiqueta="Edad" valor={`${p.edadAnios} años`} />
              {/* `nombreSexo` y no un ternario: el anterior mostraba
                  "Masculino" también para OTRO, que es un tercer valor real de
                  la base y usa otro factor en Cockcroft-Gault. */}
              <Dato etiqueta="Sexo" valor={nombreSexo(p.sexo as Sexo)} />
              <Dato etiqueta="Origen del Clcr" valor={etiquetaOrigen(p.clcrOrigen)} />
            </View>
          </View>

          {data.condicionesEfectivas.length > 0 ? (
            <Pressable
              onPress={() => router.push(`/paciente/${id}/condiciones-alergias` as never)}
              accessibilityRole="button"
              accessibilityLabel="Ver condiciones y alergias"
              className="mt-4 flex-row flex-wrap gap-1.5 border-t border-line pt-3.5"
            >
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
                  <Text className="text-eyebrow font-medio text-primary">
                    {nombreCondicion(c)}
                  </Text>
                </View>
              ))}
            </Pressable>
          ) : null}

        </Superficie>

        {/* ---------- 2. Lo más grave ---------- */}
        {destacados.length > 0 ? (
          <>
            <Eyebrow>Lo más grave</Eyebrow>
            <View className="mb-2 mt-1">
              {destacados.map((h) => (
                <Superficie
                  key={h.clave}
                  elevacion="plana"
                  className="mb-2 px-3.5 py-3"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: COLOR_SEVERIDAD[claveColorPorRango(h.rango)],
                  }}
                >
                  <View className="flex-row items-baseline">
                    <Text className="flex-1 pr-2 text-body font-medio text-ink">{h.titulo}</Text>
                    <Text
                      className="font-fuerte text-eyebrow uppercase tracking-wider"
                      style={{ color: COLOR_SEVERIDAD[claveColorPorRango(h.rango)] }}
                    >
                      {RANGO_ETIQUETA[h.rango]}
                    </Text>
                  </View>
                  <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">
                    {h.detalle}
                  </Text>
                </Superficie>
              ))}

              {data.hallazgos.length > destacados.length ? (
                <Pressable
                  onPress={() => router.push(`/paciente/${id}/hallazgos` as never)}
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
                onPress={() => router.push(`/paciente/${id}/hallazgos?categoria=${cat}` as never)}
                accesibilidad={
                  sinEvaluar
                    ? `${NOMBRE_CATEGORIA[cat]}, sin datos para evaluar`
                    : `${NOMBRE_CATEGORIA[cat]}, ${n} hallazgos${
                        rangoCat !== null ? `, lo peor es ${RANGO_ETIQUETA[rangoCat]}` : ''
                      }`
                }
              >
                <View className="flex-row items-center justify-between">
                  <Text className="mr-2 flex-1 text-meta font-medio text-ink">
                    {NOMBRE_CATEGORIA[cat]}
                  </Text>
                  {/* El número toma el color de la GRAVEDAD, no el del
                      conteo. Con la franja ya teñida por gravedad, un badge que
                      colorea por cantidad pintaba la misma tarjeta de dos
                      colores distintos: ajuste renal salía con franja naranja y
                      número rojo. Son dos escalas y no pueden convivir acá. */}
                  {sinEvaluar ? (
                    <Text className="font-mono-fuerte text-fila text-tenue">—</Text>
                  ) : (
                    <Text
                      className="font-mono-fuerte text-fila"
                      style={{ color: color ?? col.tenue, fontVariant: ['tabular-nums'] }}
                    >
                      {n}
                    </Text>
                  )}
                </View>
              </SuperficieTocable>
            );
          })}
        </View>

        {/* ---------- 3. Tratamiento activo ---------- */}
        <View className="mb-2 flex-row items-center justify-between">
          <Eyebrow>Tratamiento activo · {data.prescripciones.length}</Eyebrow>
          <Pressable
            onPress={() => router.push(`/paciente/${id}/cargar-tratamiento` as never)}
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
            onAccion={() => router.push(`/paciente/${id}/agregar-farmaco` as never)}
          />
        ) : (
          // Animadas porque esta lista se recalcula sola: suspender un fármaco
          // o aceptar una alternativa la reordena y cambia los contadores.
          data.prescripciones.map((pr, i) => (
            <FilaAnimada key={pr.id} indice={i}>
              <FilaTratamiento
                prescripcion={pr}
                onPress={() => router.push(`/paciente/${id}/hallazgos?prescripcion=${pr.id}` as never)}
              />
            </FilaAnimada>
          ))
        )}

        {totalAvisos > 0 ? (
          <Pressable
            onPress={() => router.push(`/paciente/${id}/hallazgos?avisos=1` as never)}
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

      {/* Menú del + (3.1.5) */}
      <HojaInferior visible={menuAbierto} onCerrar={() => setMenuAbierto(false)}>
        {[
          ['Editar datos del paciente', `/paciente/${id}/editar`],
          ['Agregar fármaco', `/paciente/${id}/agregar-farmaco`],
          ['Agregar condición', `/paciente/${id}/agregar-condicion`],
          ['Agregar alergia', `/paciente/${id}/agregar-alergia`],
          ['Función renal', `/paciente/${id}/datos-renales`],
          ['Función hepática', `/paciente/${id}/datos-hepaticos`],
        ].map(([titulo, ruta]) => (
          <OpcionHoja
            key={ruta}
            titulo={titulo!}
            onPress={() => {
              setMenuAbierto(false);
              router.push(ruta as never);
            }}
          />
        ))}
      </HojaInferior>
    </>
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

function Dato({
  etiqueta,
  valor,
  sufijo,
  color,
}: {
  etiqueta: string;
  valor: string;
  sufijo?: string;
  color?: string;
}) {
  const col = useColores();

  return (
    <View>
      <Text className="font-sans text-eyebrow uppercase tracking-wider text-ink-suave">{etiqueta}</Text>
      {/* El valor va en mono: es dato clínico, y con cifras de ancho fijo la
          columna no se corre cuando el Clcr pasa de 9 a 10. */}
      <Text
        className="text-fila font-mono-fuerte"
        style={{ color: color ?? col.ink, fontVariant: ['tabular-nums'] }}
      >
        {valor}
        {sufijo ? <Text className="font-sans text-meta text-ink-suave"> {sufijo}</Text> : null}
      </Text>
    </View>
  );
}

function FilaTratamiento({
  prescripcion,
  onPress,
}: {
  prescripcion: PrescripcionCockpit;
  onPress: () => void;
}) {
  // Con hallazgos se eleva, sin hallazgos queda plano. El fármaco tranquilo no
  // tiene que competir por atención con el que tiene una interacción grave.
  const conHallazgos = prescripcion.conteoHallazgos > 0;

  return (
    <SuperficieTocable
      onPress={onPress}
      elevacion={conHallazgos ? 'media' : 'plana'}
      className="mb-2.5 flex-row items-stretch"
      accesibilidad={`${prescripcion.nombre}, ${prescripcion.conteoHallazgos} hallazgos`}
    >
      <Espina rango={prescripcion.espina as RangoGravedad | null} />
      <View className="flex-1 flex-row items-center px-3.5 py-3.5">
        <View className="flex-1">
          <Text className="text-fila font-medio text-ink">{prescripcion.nombre}</Text>
          <Text className="font-sans mt-1 text-meta text-ink-suave">
            {/* La pauta en mono: son cifras, y alineadas se comparan de un
                vistazo entre filas. */}
            <Text className="font-mono">{prescripcion.dosis}</Text>
            {' · '}
            {prescripcion.frecuencia}
          </Text>
          {prescripcion.esFarmacoLibre ? (
            <View className="mt-1.5 self-start rounded-chip bg-paper px-2 py-0.5">
              <Text className="font-medio text-eyebrow uppercase tracking-wider text-ink-suave">
                No se verifica
              </Text>
            </View>
          ) : null}
        </View>
        <BadgeConteo n={prescripcion.conteoHallazgos} />
      </View>
    </SuperficieTocable>
  );
}

/**
 * El titular: la peor gravedad y cuántos hallazgos hay de ésa.
 *
 * Los adjetivos concuerdan con la categoría de lo peor —"interacción
 * contraindicada", "alerta grave"— porque decir "1 hallazgo contraindicado"
 * es correcto pero no dice de qué.
 */
function titularCockpit(peor: RangoGravedad | null, hallazgos: Cockpit['hallazgos']): string {
  if (peor === null) return 'Sin hallazgos';

  const deEsaGravedad = hallazgos.filter((h) => h.rango === peor);
  const n = deEsaGravedad.length;
  const categoria = deEsaGravedad[0]!.categoria;
  const [singular, plural] = SUSTANTIVO[categoria];
  const adjetivo = ADJETIVO[peor][n === 1 ? 0 : 1];

  return `${n} ${n === 1 ? singular : plural} ${adjetivo}`;
}

/** Sustantivo por categoría, para que el titular diga de qué se trata. */
const SUSTANTIVO: Record<CategoriaHallazgo, [string, string]> = {
  INTERACCION: ['interacción', 'interacciones'],
  CONDICION: ['alerta', 'alertas'],
  AJUSTE_RENAL: ['ajuste renal', 'ajustes renales'],
  AJUSTE_HEPATICO: ['ajuste hepático', 'ajustes hepáticos'],
};

/** Femenino: concuerda con "interacción" y "alerta", que son las dos
 *  categorías que más aparecen como lo peor. */
const ADJETIVO: Record<RangoGravedad, [string, string]> = {
  0: ['contraindicada', 'contraindicadas'],
  1: ['grave', 'graves'],
  2: ['de atención', 'de atención'],
  3: ['informativa', 'informativas'],
};

/** El desglose completo, para no perder lo que las tarjetas ya no repiten. */
function detalleCockpit(hallazgos: Cockpit['hallazgos']): string | undefined {
  if (hallazgos.length === 0) {
    return 'Ningún fármaco del tratamiento dispara alertas con los datos cargados. No es lo mismo que decir que sea seguro.';
  }

  const partes = ([0, 1, 2, 3] as RangoGravedad[])
    .map((r) => ({ r, n: hallazgos.filter((h) => h.rango === r).length }))
    .filter((x) => x.n > 0)
    // Rango 2 se lee "de atención": "5 atención" no es español.
    .map((x) =>
      x.r === 2
        ? `${x.n} de atención`
        : `${x.n} ${RANGO_ETIQUETA[x.r].toLowerCase()}${x.n > 1 ? 's' : ''}`,
    );

  const total = hallazgos.length;
  return `${total} ${total === 1 ? 'hallazgo' : 'hallazgos'} en total: ${partes.join(', ')}.`;
}

/** El peor rango de cada categoría. Ausente = la categoría no tiene ninguno. */
function peoresPorCategoria(
  hallazgos: Cockpit['hallazgos'],
): Partial<Record<CategoriaHallazgo, RangoGravedad>> {
  const salida: Partial<Record<CategoriaHallazgo, RangoGravedad>> = {};

  for (const h of hallazgos) {
    const actual = salida[h.categoria];
    if (actual === undefined || h.rango < actual) salida[h.categoria] = h.rango;
  }

  return salida;
}
