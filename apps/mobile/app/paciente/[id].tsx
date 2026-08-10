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
import { BadgeConteo, Espina } from '@/ui/severidad';
import { COLOR_SEVERIDAD, type RangoGravedad } from '@gfh/shared-types';
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
 * Tres bloques y nada más: quién es el paciente, el resumen del diagnóstico, y
 * qué está tomando. Los hallazgos NO van acá — cada tarjeta del diagnóstico y
 * cada fármaco abren su propia pantalla.
 *
 * Es deliberado: catorce hallazgos sueltos uno abajo del otro son una pared de
 * texto donde no se distingue lo grave de lo informativo. Esta pantalla
 * responde "¿cuánto hay y de qué tipo?"; el detalle se pide.
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
              <Dato etiqueta="Sexo" valor={p.sexo === 'F' ? 'Femenino' : 'Masculino'} />
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

          <Pressable
            onPress={() => router.push(`/paciente/${id}/editar` as never)}
            accessibilityRole="button"
            className="mt-3.5 self-start"
          >
            <Text className="text-meta font-medio text-accent">Editar datos</Text>
          </Pressable>
        </Superficie>

        {/* ---------- 2. Diagnóstico ---------- */}
        <Eyebrow>Diagnóstico</Eyebrow>
        <View className="mb-5 flex-row flex-wrap gap-2">
          {(Object.keys(NOMBRE_CATEGORIA) as CategoriaHallazgo[]).map((cat) => {
            const n = data.dashboard[cat];
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
                contenedor="min-w-[47%] flex-1"
                className="px-3.5 py-3.5"
                style={n === 0 ? { opacity: 0.72 } : undefined}
                onPress={() => router.push(`/paciente/${id}/hallazgos?categoria=${cat}` as never)}
                accesibilidad={`${NOMBRE_CATEGORIA[cat]}, ${n} hallazgos`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="mr-2 flex-1 text-meta font-medio text-ink">
                    {NOMBRE_CATEGORIA[cat]}
                  </Text>
                  <BadgeConteo n={n} />
                </View>
              </SuperficieTocable>
            );
          })}
        </View>

        {/* ---------- 3. Tratamiento activo ---------- */}
        <View className="mb-2 flex-row items-center justify-between">
          <Eyebrow>Tratamiento activo</Eyebrow>
          <Pressable
            onPress={() => router.push(`/paciente/${id}/foto` as never)}
            accessibilityRole="button"
          >
            <Text className="mb-2 text-meta font-medio text-accent">Cargar lista</Text>
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
