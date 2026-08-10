import { useQuery } from '@tanstack/react-query';
import { Link, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { FilaPaciente, Inicio as DatosInicio } from '@/api/tipos';
import { Icono } from '@/ui/iconos';
import { FilaAnimada } from '@/ui/animacion';
import { Superficie } from '@/ui/superficie';
import { HojaInferior, OpcionHoja } from '@/ui/hoja-inferior';
import { CampoTexto, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { claveColorPorClcr, COLOR_SEVERIDAD } from '@gfh/shared-types';

export default function Inicio() {
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [consulta, setConsulta] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inicio', consulta],
    queryFn: () =>
      api.get<DatosInicio>(consulta.trim() ? `/inicio?q=${encodeURIComponent(consulta.trim())}` : '/inicio'),
  });

  const sinPacientes =
    (data?.grupos.every((g) => g.pacientes.length === 0) ?? true) &&
    (data?.sinGrupo.length ?? 0) === 0;

  return (
    <>
      <Stack.Screen
        options={{
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
          {sinPacientes && data?.buscando ? (
            <Estado
              titulo="Sin coincidencias"
              detalle={`Ningún paciente coincide con «${consulta.trim()}».`}
            />
          ) : null}

          {sinPacientes && !data?.buscando ? (
            <Estado
              titulo="Todavía no cargaste pacientes"
              detalle="Creá uno para ver interacciones, ajuste renal y alertas."
              accion="Crear paciente"
              onAccion={() => router.push('/crear-paciente')}
            />
          ) : null}

          {data?.grupos.map((grupo) => (
            <View key={grupo.id} className="mb-5">
              <View className="mb-2 flex-row items-center justify-between">
                <Eyebrow>{grupo.nombre}</Eyebrow>
                {!data.buscando ? (
                  <Pressable
                    onPress={() => router.push(`/grupo/${grupo.id}`)}
                    accessibilityRole="button"
                  >
                    <Text className="mb-2 text-meta font-medio text-accent">Editar</Text>
                  </Pressable>
                ) : null}
              </View>
              {grupo.pacientes.length === 0 ? (
                <Text className="font-sans mb-2 px-1 text-meta text-ink-suave">Sin pacientes.</Text>
              ) : (
                grupo.pacientes.map((p, i) => (
                  <FilaAnimada key={p.id} indice={i}>
                    <Fila paciente={p} />
                  </FilaAnimada>
                ))
              )}
            </View>
          ))}

          {(data?.sinGrupo.length ?? 0) > 0 ? (
            <View className="mb-5">
              <Eyebrow>Sin grupo</Eyebrow>
              {data?.sinGrupo.map((p, i) => (
                <FilaAnimada key={p.id} indice={i}>
                  <Fila paciente={p} />
                </FilaAnimada>
              ))}
            </View>
          ) : null}
        </ResultadoConsulta>
      </Pantalla>

      {/* Menú del botón + (2.3) */}
      <HojaInferior visible={menuAbierto} onCerrar={() => setMenuAbierto(false)}>
        {[
          ['Crear paciente', '/crear-paciente'],
          ['Crear grupo', '/crear-grupo'],
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

function Fila({ paciente }: { paciente: FilaPaciente }) {
  // Banda KDIGO: sin dato es neutro, nunca verde.
  const color = COLOR_SEVERIDAD[claveColorPorClcr(paciente.clcrMlMin)];

  return (
    <Link href={`/paciente/${paciente.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${paciente.nombre} ${paciente.apellido}, ${paciente.edadAnios} años`}
      >
        <Superficie elevacion="plana" className="mb-2.5 flex-row items-stretch">
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
            {/* El Clcr alineado a la derecha, en su propio bloque: en una lista
                de pacientes es la columna que se recorre de arriba abajo, y
                mezclado en la línea de la edad obligaba a buscarlo. */}
            <View className="items-end">
              <Text
                className="font-mono-fuerte text-fila"
                style={{ color, fontVariant: ['tabular-nums'] }}
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
