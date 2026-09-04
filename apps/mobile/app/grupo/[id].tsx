import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { FilaPaciente } from '@/api/tipos';
import * as API from '@/api/endpoints';
import { FilaAnimada } from '@/ui/animacion';
import { BotonAvatar, EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { Estado, Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { Superficie } from '@/ui/superficie';
import {
  claveColorPorClcr,
  colorEspina,
  COLOR_SEVERIDAD,
  RANGO_ETIQUETA,
  type RangoGravedad,
} from '@gfh/shared-types';

/**
 * Los pacientes de un grupo.
 *
 * Antes esta pantalla era el formulario de renombrar. Se invirtió: entrar al
 * grupo es lo que se hace el 95% de las veces, y editarlo pasó al lápiz junto
 * al nombre. Tener "Editar" en el cuerpo hacía que compitiera con lo obvio.
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
    queryFn: API.inicio,
  });

  const resumen = data?.grupos.find((g) => (sinGrupo ? g.id === null : g.id === id));
  const pacientes = (data?.pacientes ?? []).filter((p) =>
    sinGrupo ? p.grupoId === null : p.grupoId === id,
  );

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoApp derecha={<BotonAvatar onPress={() => router.push('/(tabs)/perfil')} />} />

      <Pantalla>
        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={3}
        >
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-[32px] font-fuerte leading-10 text-ink">
                {resumen?.nombre ?? 'Grupo'}
              </Text>
              {sinGrupo ? null : (
                <Pressable
                  onPress={() => router.push(`/grupo/${id}/editar` as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Editar nombre del grupo"
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center rounded-full"
                >
                  <Icono nombre="editar" tamano={15} color="#3F4940" />
                </Pressable>
              )}
            </View>
            {resumen ? (
              <View
                className="rounded-full border px-3 py-1"
                style={{ backgroundColor: '#F2F3F9', borderColor: '#BECABD' }}
              >
                <Text className="text-meta font-medio" style={{ color: '#5C6B64' }}>
                  {resumen.pacientes} {resumen.pacientes === 1 ? 'paciente' : 'pacientes'}
                </Text>
              </View>
            ) : null}
          </View>

          {resumen && resumen.pacientes > 0 ? (
            <Superficie elevacion="plana" className="mb-4 p-4">
              <Text className="text-grande font-medio text-ink">Estado Global</Text>

              <View className="mt-3">
                <Text className="mb-1 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
                  Distribución de severidad
                </Text>
                <View className="flex-row overflow-hidden rounded-full" style={{ height: 12 }}>
                  {[
                    { n: resumen.contraindicados + resumen.graves, color: COLOR_SEVERIDAD.grave },
                    { n: resumen.atencion, color: COLOR_SEVERIDAD.media },
                    { n: resumen.sinHallazgos, color: COLOR_SEVERIDAD.ok },
                    { n: resumen.informativos, color: COLOR_SEVERIDAD.neutro },
                  ]
                    .filter((t) => t.n > 0)
                    .map((t) => (
                      <View key={t.color} style={{ flex: t.n, height: 12, backgroundColor: t.color }} />
                    ))}
                </View>

                <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1.5">
                  {[
                    { n: resumen.contraindicados + resumen.graves, color: COLOR_SEVERIDAD.grave, etiqueta: 'grave' },
                    { n: resumen.atencion, color: COLOR_SEVERIDAD.media, etiqueta: 'en atención' },
                    { n: resumen.sinHallazgos, color: COLOR_SEVERIDAD.ok, etiqueta: 'sin hallazgos' },
                    { n: resumen.informativos, color: COLOR_SEVERIDAD.neutro, etiqueta: 'informativo' },
                  ]
                    .filter((t) => t.n > 0)
                    .map((t) => (
                      <View key={t.color} className="flex-row items-center gap-1.5">
                        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                        <Text className="text-body font-medio text-ink-suave">
                          {t.n} {t.etiqueta}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
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
              <Text className="mb-3 text-grande font-medio text-ink">Pacientes</Text>
              {pacientes.map((p, i) => (
                <FilaAnimada key={p.id} indice={i}>
                  <Fila paciente={p} />
                </FilaAnimada>
              ))}
            </>
          )}
        </ResultadoConsulta>
      </Pantalla>
    </View>
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
        accessibilityLabel={`${paciente.nombre} ${paciente.apellido}, ${paciente.edadAnios} años, ${paciente.conteoHallazgos} hallazgos`}
      >
        <Superficie
          elevacion={paciente.peorRango !== null ? 'media' : 'plana'}
          className="mb-2.5 flex-row items-stretch"
        >
          <View style={{ width: 4, backgroundColor: color }} />
          <View className="flex-1 flex-row items-center px-3.5 py-3.5">
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-fila font-medio text-ink">
                  {paciente.apellido}, {paciente.nombre}
                </Text>
                {paciente.peorRango !== null ? (
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: color }}>
                    <Text className="font-fuerte text-[10px] uppercase tracking-wider text-white">
                      {RANGO_ETIQUETA[paciente.peorRango as RangoGravedad]}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="font-sans mt-1 text-meta text-ink-suave">
                {paciente.edadAnios} años
              </Text>
            </View>

            <View className="items-end pl-2">
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
