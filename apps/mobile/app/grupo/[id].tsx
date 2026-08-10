import { useQuery } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { FilaPaciente, Inicio } from '@/api/tipos';
import { FilaAnimada } from '@/ui/animacion';
import { Icono } from '@/ui/iconos';
import { Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { Superficie } from '@/ui/superficie';
import { claveColorPorClcr, colorEspina, COLOR_SEVERIDAD, type RangoGravedad } from '@gfh/shared-types';

/**
 * Los pacientes de un grupo.
 *
 * Antes esta pantalla era el formulario de renombrar. Se invirtió: entrar al
 * grupo es lo que se hace el 95% de las veces, y editarlo pasó al lápiz del
 * header. Tener "Editar" en el cuerpo hacía que compitiera con lo obvio.
 *
 * `sin-grupo` es un id reservado: los pacientes sin grupo asignado también
 * necesitan poder verse juntos, y no tienen fila propia en la base.
 */
export default function DetalleGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const sinGrupo = id === 'sin-grupo';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inicio', ''],
    queryFn: () => api.get<Inicio>('/inicio'),
  });

  const resumen = data?.grupos.find((g) => (sinGrupo ? g.id === null : g.id === id));
  const pacientes = (data?.pacientes ?? []).filter((p) =>
    sinGrupo ? p.grupoId === null : p.grupoId === id,
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: resumen?.nombre ?? 'Grupo',
          headerRight: sinGrupo
            ? undefined
            : () => (
                <Pressable
                  onPress={() => router.push(`/grupo/${id}/editar` as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Editar grupo"
                  className="mr-3 h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                >
                  <Icono nombre="editar" tamano={16} color="#FFFFFF" />
                </Pressable>
              ),
        }}
      />

      <Pantalla>
        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={3}
        >
          {resumen && resumen.pacientes > 0 ? (
            <Superficie elevacion="plana" className="mb-4 px-4 py-3.5">
              <View className="flex-row" style={{ gap: 3 }}>
                {[
                  { n: resumen.sinHallazgos, color: COLOR_SEVERIDAD.ok },
                  { n: resumen.informativos, color: COLOR_SEVERIDAD.neutro },
                  { n: resumen.atencion, color: COLOR_SEVERIDAD.media },
                  { n: resumen.graves + resumen.contraindicados, color: COLOR_SEVERIDAD.grave },
                ]
                  .filter((t) => t.n > 0)
                  .map((t) => (
                    <View
                      key={t.color}
                      style={{ flex: t.n, height: 6, borderRadius: 3, backgroundColor: t.color }}
                    />
                  ))}
              </View>
              <Text className="font-sans mt-2.5 text-meta text-ink-suave">
                <Text className="font-mono-fuerte text-body text-ink">{resumen.pacientes}</Text>{' '}
                {resumen.pacientes === 1 ? 'paciente' : 'pacientes'}
                {resumen.graves + resumen.contraindicados > 0
                  ? ` · ${resumen.graves + resumen.contraindicados} con hallazgo grave`
                  : ''}
              </Text>
            </Superficie>
          ) : null}

          {pacientes.length === 0 ? (
            <Estado
              titulo="Sin pacientes"
              detalle={
                sinGrupo
                  ? 'Todos tus pacientes están asignados a un grupo.'
                  : 'Asigná pacientes a este grupo desde su ficha.'
              }
            />
          ) : (
            <>
              <Eyebrow>Pacientes</Eyebrow>
              {pacientes.map((p, i) => (
                <FilaAnimada key={p.id} indice={i}>
                  <Fila paciente={p} />
                </FilaAnimada>
              ))}
            </>
          )}
        </ResultadoConsulta>
      </Pantalla>
    </>
  );
}

function Fila({ paciente }: { paciente: FilaPaciente }) {
  const color =
    paciente.peorRango !== null
      ? colorEspina(paciente.peorRango as RangoGravedad)
      : COLOR_SEVERIDAD[claveColorPorClcr(paciente.clcrMlMin)];
  const colorClcr = COLOR_SEVERIDAD[claveColorPorClcr(paciente.clcrMlMin)];

  return (
    <Link href={`/paciente/${paciente.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${paciente.nombre} ${paciente.apellido}, ${paciente.conteoHallazgos} hallazgos`}
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
              </Text>
            </View>
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
          </View>
        </Superficie>
      </Pressable>
    </Link>
  );
}
