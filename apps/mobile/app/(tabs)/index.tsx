import { useQuery } from '@tanstack/react-query';
import { Link, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { FilaPaciente, Inicio as DatosInicio } from '@/api/tipos';
import { FilaAnimada } from '@/ui/animacion';
import { HojaInferior, OpcionHoja } from '@/ui/hoja-inferior';
import { Icono } from '@/ui/iconos';
import { CampoTexto, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { Superficie } from '@/ui/superficie';
import { claveColorPorClcr, colorEspina, COLOR_SEVERIDAD, type RangoGravedad } from '@gfh/shared-types';

/**
 * Pacientes (2.x). Lista PLANA, no agrupada.
 *
 * El orden lo decide el backend: peor gravedad primero, después cantidad de
 * hallazgos, recién ahí alfabético. Un paciente con una interacción
 * contraindicada tiene que estar arriba aunque su apellido empiece con Z.
 *
 * Los grupos no encabezan la lista: aparecen como dato de cada fila y tienen
 * su propia pantalla. Con 40 pacientes en 3 grupos, los encabezados obligaban
 * a scrollear entre secciones para encontrar a uno.
 */
export default function Pacientes() {
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [consulta, setConsulta] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inicio', consulta],
    queryFn: () =>
      api.get<DatosInicio>(
        consulta.trim() ? `/inicio?q=${encodeURIComponent(consulta.trim())}` : '/inicio',
      ),
  });

  const pacientes = data?.pacientes ?? [];
  const conHallazgos = pacientes.filter((p) => p.peorRango !== null);
  const limpios = pacientes.filter((p) => p.peorRango === null);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Pacientes',
          headerRight: () => (
            <Pressable
              onPress={() => setMenuAbierto(true)}
              accessibilityRole="button"
              accessibilityLabel="Crear"
              className="mr-3 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Icono nombre="mas" tamano={18} color="#FFFFFF" />
            </Pressable>
          ),
        }}
      />

      <Pantalla>
        <CampoTexto
          value={consulta}
          onChangeText={setConsulta}
          placeholder="Buscar por nombre o documento"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar paciente"
        />

        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={3}
        >
          {pacientes.length === 0 && data?.buscando ? (
            <Estado
              titulo="Sin coincidencias"
              detalle={`Ningún paciente coincide con «${consulta.trim()}».`}
            />
          ) : null}

          {pacientes.length === 0 && !data?.buscando ? (
            <Estado
              titulo="Todavía no cargaste pacientes"
              detalle="Creá uno para ver interacciones, ajuste renal y alertas."
              accion="Crear paciente"
              onAccion={() => router.push('/crear-paciente')}
            />
          ) : null}

          {conHallazgos.length > 0 ? (
            <>
              <Eyebrow>Requieren atención · {conHallazgos.length}</Eyebrow>
              {conHallazgos.map((p, i) => (
                <FilaAnimada key={p.id} indice={i}>
                  <Fila paciente={p} />
                </FilaAnimada>
              ))}
            </>
          ) : null}

          {limpios.length > 0 ? (
            <View className={conHallazgos.length > 0 ? 'mt-4' : ''}>
              <Eyebrow>Sin hallazgos · {limpios.length}</Eyebrow>
              {limpios.map((p, i) => (
                <FilaAnimada key={p.id} indice={i}>
                  <Fila paciente={p} />
                </FilaAnimada>
              ))}
            </View>
          ) : null}
        </ResultadoConsulta>
      </Pantalla>

      <HojaInferior visible={menuAbierto} onCerrar={() => setMenuAbierto(false)}>
        {[
          ['Crear paciente', '/crear-paciente', 'pacientes'],
          ['Crear grupo', '/crear-grupo', 'grupos'],
        ].map(([titulo, ruta, icono]) => (
          <OpcionHoja
            key={ruta}
            titulo={titulo!}
            icono={icono as 'pacientes' | 'grupos'}
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

function Fila({ paciente }: { paciente: FilaPaciente }) {
  // La banda es la del hallazgo más grave, no la del Clcr: es lo que define si
  // el paciente necesita atención. Sin hallazgos cae al color del Clcr, que
  // sigue siendo un dato — y "sin dato" es neutro, nunca verde.
  const color =
    paciente.peorRango !== null
      ? colorEspina(paciente.peorRango as RangoGravedad)
      : COLOR_SEVERIDAD[claveColorPorClcr(paciente.clcrMlMin)];

  const colorClcr = COLOR_SEVERIDAD[claveColorPorClcr(paciente.clcrMlMin)];

  return (
    <Link href={`/paciente/${paciente.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${paciente.nombre} ${paciente.apellido}, ${paciente.edadAnios} años, ${paciente.conteoHallazgos} hallazgos`}
      >
        <Superficie
          elevacion={paciente.peorRango !== null ? 'media' : 'plana'}
          className="mb-2.5 flex-row items-stretch"
        >
          <View style={{ width: 4, backgroundColor: color }} />
          <View className="flex-1 flex-row items-center px-3.5 py-3.5">
            <View className="flex-1">
              <Text className="text-fila font-medio text-ink">
                {paciente.apellido}, {paciente.nombre}
              </Text>
              <Text className="font-sans mt-1 text-meta text-ink-suave">
                {paciente.edadAnios} años
                {paciente.grupoNombre ? ` · ${paciente.grupoNombre}` : ''}
              </Text>
            </View>

            {/* El Clcr en su propio bloque a la derecha: en una lista es la
                columna que se recorre de arriba abajo. */}
            <View className="items-end">
              <Text
                className="font-mono-fuerte text-fila"
                style={{ color: colorClcr, fontVariant: ['tabular-nums'] }}
              >
                {paciente.clcrMlMin ?? '—'}
              </Text>
              <Text className="font-sans text-eyebrow text-ink-suave">
                {paciente.clcrMlMin !== null ? 'mL/min' : 'sin dato'}
              </Text>
            </View>

            {paciente.conteoHallazgos > 0 ? (
              <View className="ml-2.5">
                <BadgeHallazgos n={paciente.conteoHallazgos} rango={paciente.peorRango} />
              </View>
            ) : null}
          </View>
        </Superficie>
      </Pressable>
    </Link>
  );
}

/**
 * Cuántos hallazgos tiene, teñido por el PEOR de ellos.
 *
 * Distinto del badge del cockpit, que mide cantidad en una escala propia: acá
 * el color viene de la gravedad porque es lo que decide si hay que entrar.
 */
function BadgeHallazgos({ n, rango }: { n: number; rango: number | null }) {
  const color = colorEspina((rango ?? 3) as RangoGravedad);

  return (
    <View
      className="h-6 min-w-[24px] items-center justify-center rounded-chip px-1"
      style={{ backgroundColor: `${color}1F`, borderWidth: 1, borderColor: `${color}55` }}
    >
      <Text className="text-eyebrow font-fuerte" style={{ color: oscurecer(color) }}>
        {n}
      </Text>
    </View>
  );
}

/** El texto sobre el fondo translúcido necesita más contraste que el hex puro. */
function oscurecer(hex: string): string {
  const mapa: Record<string, string> = {
    [COLOR_SEVERIDAD.grave]: '#991B1B',
    [COLOR_SEVERIDAD.media]: '#92400E',
    [COLOR_SEVERIDAD.ok]: '#166534',
    [COLOR_SEVERIDAD.neutro]: '#44544C',
  };
  return mapa[hex] ?? hex;
}
