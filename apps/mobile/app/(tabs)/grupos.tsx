import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { Inicio, ResumenGrupo } from '@/api/tipos';
import { FilaAnimada } from '@/ui/animacion';
import { Icono } from '@/ui/iconos';
import { Estado, Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { SuperficieTocable } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { COLOR_SEVERIDAD } from '@gfh/shared-types';
import { Pressable } from 'react-native';

/**
 * Grupos: un resumen por ámbito de trabajo, no otra lista de pacientes.
 *
 * Pacientes responde "¿a quién tengo que mirar?"; esta pantalla responde
 * "¿cómo viene cada lugar donde trabajo?". Si fuera una lista de pacientes
 * agrupada serían dos caminos al mismo lado.
 *
 * Lo que la hace valer la pena es la barra de composición: se ve que en CTI la
 * mitad tiene hallazgos sin abrir nada.
 */
export default function Grupos() {
  const router = useRouter();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inicio', ''],
    queryFn: () => api.get<Inicio>('/inicio'),
  });

  const grupos = data?.grupos ?? [];
  const conNombre = grupos.filter((g) => g.id !== null);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Grupos',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/crear-grupo')}
              accessibilityRole="button"
              accessibilityLabel="Crear grupo"
              className="mr-3 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Icono nombre="mas" tamano={18} color="#FFFFFF" />
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
          {conNombre.length === 0 ? (
            <Estado
              titulo="Todavía no tenés grupos"
              detalle="Sirven para separar consultorio, CTI o guardia. Un paciente puede estar en uno solo."
              accion="Crear grupo"
              onAccion={() => router.push('/crear-grupo')}
            />
          ) : null}

          {grupos.map((g, i) => (
            <FilaAnimada key={g.id ?? 'sin-grupo'} indice={i}>
              <TarjetaGrupo
                grupo={g}
                onPress={() =>
                  router.push(
                    g.id === null ? '/grupo/sin-grupo' : (`/grupo/${g.id}` as never),
                  )
                }
              />
            </FilaAnimada>
          ))}
        </ResultadoConsulta>
      </Pantalla>
    </>
  );
}

function TarjetaGrupo({ grupo, onPress }: { grupo: ResumenGrupo; onPress: () => void }) {
  const col = useColores();
  // `esGrave` es la definición del sistema: contraindicado o grave.
  const conRiesgo = grupo.contraindicados + grupo.graves;

  return (
    <SuperficieTocable
      onPress={onPress}
      elevacion={conRiesgo > 0 ? 'media' : 'plana'}
      contenedor="mb-2.5"
      className="px-4 py-3.5"
      accesibilidad={`${grupo.nombre}, ${grupo.pacientes} pacientes, ${grupo.graves} graves`}
      style={grupo.pacientes === 0 ? { opacity: 0.7 } : undefined}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-fila font-fuerte text-ink">{grupo.nombre}</Text>
        <Icono nombre="chevron" tamano={16} color={COLOR_SEVERIDAD.neutro} />
      </View>

      {grupo.pacientes > 0 ? (
        <>
          <BarraComposicion grupo={grupo} />
          <View className="mt-2.5 flex-row flex-wrap gap-x-4 gap-y-1">
            <Dato n={grupo.pacientes} etiqueta={grupo.pacientes === 1 ? 'paciente' : 'pacientes'} />
            {grupo.contraindicados > 0 ? (
              <Dato n={grupo.contraindicados} etiqueta="contraindicado" color={col.peligro} />
            ) : null}
            {grupo.graves > 0 ? <Dato n={grupo.graves} etiqueta="grave" color={col.peligro} /> : null}
            {grupo.atencion > 0 ? (
              <Dato n={grupo.atencion} etiqueta="en atención" color="#92400E" />
            ) : null}
          </View>
        </>
      ) : (
        <Text className="font-sans mt-1.5 text-meta text-ink-suave">Sin pacientes.</Text>
      )}
    </SuperficieTocable>
  );
}

/**
 * La composición de riesgo del grupo, en proporción.
 *
 * Cada segmento usa el color de severidad del sistema: es información clínica,
 * no un gráfico decorativo. Los tramos con cero no se dibujan para que la barra
 * no mienta con segmentos de ancho mínimo.
 */
function BarraComposicion({ grupo }: { grupo: ResumenGrupo }) {
  // El orden va de lo tranquilo a lo grave, de izquierda a derecha.
  const tramos = [
    { clave: 'ok', n: grupo.sinHallazgos, color: COLOR_SEVERIDAD.ok },
    { clave: 'info', n: grupo.informativos, color: COLOR_SEVERIDAD.neutro },
    { clave: 'atencion', n: grupo.atencion, color: COLOR_SEVERIDAD.media },
    { clave: 'grave', n: grupo.graves + grupo.contraindicados, color: COLOR_SEVERIDAD.grave },
  ].filter((t) => t.n > 0);

  return (
    <View className="mt-3 flex-row" style={{ gap: 3 }}>
      {tramos.map((t) => (
        <View
          key={t.clave}
          style={{ flex: t.n, height: 6, borderRadius: 3, backgroundColor: t.color }}
        />
      ))}
    </View>
  );
}

function Dato({ n, etiqueta, color }: { n: number; etiqueta: string; color?: string }) {
  return (
    <Text className="font-sans text-meta text-ink-suave">
      <Text className="font-mono-fuerte text-body" style={color ? { color } : undefined}>
        {n}
      </Text>{' '}
      {etiqueta}
    </Text>
  );
}
