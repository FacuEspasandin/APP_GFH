import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { ConsultaPlegada, GrupoGravedad } from '@/ui/herramienta';
import { Boton, Cargando, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { COLOR_SEVERIDAD, colorEspina, type RangoGravedad } from '@gfh/shared-types';

interface Alternativa {
  paAlternativaId: string;
  nombre: string;
  razon: string;
  evidencia: string | null;
  interaccionesPotenciales: Array<{ paNombre: string; severidad: string }>;
  alergia: { tipo: string; rango: RangoGravedad; grupoNombre: string | null } | null;
  alertasCondicion: Array<{ condicionNombre: string; severidad: string }>;
  totalProblemas: number;
  yaAceptada?: boolean;
}

interface Respuesta {
  farmacoOrigen: string;
  sinDatos: boolean;
  motivo: string | null;
  viables: Alternativa[];
  descartadas: Array<{ nombre: string; motivo: string }>;
  paOrigenIds?: string[];
}

const MOTIVO: Record<string, string> = {
  ALERGIA_BLOQUEA: 'alergia grave registrada a este principio activo',
  CRUCE_FAMILIA_CONTRAINDICADO: 'cruce de familia contraindicado',
  CONDICION_CONTRAINDICADA: 'alerta de condición contraindicada',
};

/** El verde de "documentada" marca un estado del registro, no gravedad
 *  clínica: por eso no sale de `COLOR_SEVERIDAD`. */
const VERDE_DOCUMENTADA = '#166534';

/**
 * Alternativas terapéuticas (3.6.1).
 *
 * Vienen anotadas contra este paciente y agrupadas por lo que arrastran: las
 * limpias primero. Elegir una lleva a la pantalla de reemplazo, que pide la
 * pauta y cambia la medicación de verdad — antes esto sólo dejaba registro.
 */
export default function Alternativas() {
  const { id: pacienteId, prescripcion } = useLocalSearchParams<{
    id: string;
    prescripcion?: string;
  }>();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['alternativas', pacienteId, prescripcion],
    queryFn: () =>
      api.get<Respuesta>(`/pacientes/${pacienteId}/prescripciones/${prescripcion}/alternativas`),
    enabled: Boolean(pacienteId && prescripcion),
  });

  if (!prescripcion) {
    // Se llega acá sólo por enlace directo: desde el cockpit siempre viene con
    // la prescripción. Antes mostraba "No se pudo cargar" con el detalle vacío,
    // que parecía una falla del servidor.
    return (
      <Pantalla>
        <Estado
          titulo="Sin fármaco elegido"
          detalle="Las alternativas se piden desde un fármaco del tratamiento."
        />
      </Pantalla>
    );
  }

  if (isLoading) return <Cargando />;
  if (error || !data) {
    return (
      <Pantalla>
        <Estado
          titulo="No se pudo cargar"
          detalle={
            error instanceof Error && error.message
              ? error.message
              : 'Probá de nuevo en unos segundos.'
          }
        />
      </Pantalla>
    );
  }

  const grupos = agrupar(data.viables);
  const limpias = data.viables.filter((a) => problemas(a).length === 0).length;

  return (
    <View className="flex-1 bg-paper">
      <ConsultaPlegada
        titulo={`En lugar de ${data.farmacoOrigen}`}
        detalle={resumen(data.viables.length, limpias)}
        onCambiar={() => router.back()}
      />

      <ScrollView contentContainerClassName="px-4 pb-4 pt-3">
        {data.sinDatos ? (
          <Superficie elevacion="plana" className="mb-3 px-3.5 py-3">
            <Text className="font-sans text-meta leading-5 text-ink-suave">{data.motivo}</Text>
          </Superficie>
        ) : null}

        {!data.sinDatos && data.viables.length === 0 ? (
          <Estado
            titulo="Sin alternativas anotadas"
            detalle="El catálogo no tiene reemplazos para este fármaco. No significa que no existan."
          />
        ) : null}

        {grupos.map((g) => (
          <View key={String(g.rango)}>
            {g.rango === null ? (
              <View className="mb-1.5 mt-1 flex-row items-center">
                <View
                  className="mr-2 rounded-full"
                  style={{ width: 8, height: 8, backgroundColor: COLOR_SEVERIDAD.ok }}
                />
                <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
                  Sin alertas · {g.filas.length}
                </Text>
              </View>
            ) : (
              <GrupoGravedad rango={g.rango} cuantos={g.filas.length} />
            )}

            {g.filas.map((alt) => (
              <TarjetaAlternativa
                key={alt.paAlternativaId}
                alt={alt}
                onReemplazar={() =>
                  router.push({
                    pathname: '/paciente/[id]/aceptar-alternativa',
                    params: {
                      id: pacienteId,
                      paOrigenId: data.paOrigenIds?.[0] ?? '',
                      paAlternativaId: alt.paAlternativaId,
                      ...(prescripcion ? { prescripcion } : {}),
                      origen: data.farmacoOrigen,
                      alternativa: alt.nombre,
                    },
                  } as never)
                }
              />
            ))}
          </View>
        ))}

        {data.viables.length > 0 ? (
          <Superficie elevacion="plana" className="mb-3 mt-2 px-3.5 py-3">
            {/* Regla 5: el silencio del catálogo no es seguridad. */}
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              «Sin alertas» mide lo que el catálogo tiene cargado sobre este paciente. No dice que
              la alternativa sea mejor.
            </Text>
          </Superficie>
        ) : null}

        {data.descartadas.length > 0 ? (
          <View className="mt-3">
            <Eyebrow>No se ofrecen</Eyebrow>
            {data.descartadas.map((d, i) => (
              <Superficie key={i} elevacion="plana" className="mb-2 px-3.5 py-2.5">
                <Text className="font-sans text-meta text-ink">
                  <Text className="font-medio">{d.nombre}</Text> — {MOTIVO[d.motivo] ?? 'descartada'}
                </Text>
              </Superficie>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function TarjetaAlternativa({ alt, onReemplazar }: { alt: Alternativa; onReemplazar: () => void }) {
  const lista = problemas(alt);
  const peor = lista.length === 0 ? null : (Math.min(...lista.map((p) => p.rango)) as RangoGravedad);

  return (
    <Superficie
      elevacion={lista.length === 0 ? 'media' : 'plana'}
      className="mb-2.5 px-3.5 py-3"
      style={{ borderLeftWidth: 4, borderLeftColor: colorEspina(peor) }}
    >
      <View className="flex-row items-baseline">
        <Text className="flex-1 pr-2 text-body font-medio text-ink">{alt.nombre}</Text>
        {/* El conteo va en cada tarjeta aunque el grupo ya diga la gravedad:
            dos alternativas dentro de "Atención" no son iguales si una arrastra
            una alerta y la otra tres. */}
        <Text
          className="font-medio text-eyebrow uppercase tracking-wider"
          style={{ color: colorEspina(peor) }}
        >
          {lista.length === 0
            ? 'Sin alertas'
            : `${lista.length} ${lista.length === 1 ? 'alerta' : 'alertas'}`}
        </Text>
      </View>

      {alt.yaAceptada ? (
        <Text
          className="mt-1 font-fuerte text-eyebrow uppercase tracking-wider"
          style={{ color: VERDE_DOCUMENTADA }}
        >
          Ya documentada
        </Text>
      ) : null}

      <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">{alt.razon}</Text>

      {lista.map((p, k) => (
        <View key={k} className="mt-1.5 flex-row items-start">
          <View
            className="mr-2 mt-1.5 rounded-full"
            style={{ width: 5, height: 5, backgroundColor: colorEspina(p.rango) }}
          />
          <Text className="font-sans flex-1 text-meta leading-4 text-ink-suave">{p.texto}</Text>
        </View>
      ))}

      <View className="mt-3">
        <Boton variante="secundario" onPress={onReemplazar}>
          {`Reemplazar por ${alt.nombre}`}
        </Boton>
      </View>
    </Superficie>
  );
}

/** Todo lo que una alternativa arrastra, con su gravedad, en una sola lista. */
function problemas(alt: Alternativa): Array<{ rango: RangoGravedad; texto: string }> {
  return [
    ...alt.interaccionesPotenciales.map((i) => ({
      rango: (i.severidad === 'CONTRAINDICADA'
        ? 0
        : i.severidad === 'ALTA'
          ? 1
          : 3) as RangoGravedad,
      texto: `Interactúa con ${i.paNombre} (${i.severidad.toLowerCase()})`,
    })),
    ...alt.alertasCondicion.map((a) => ({
      rango: 2 as RangoGravedad,
      texto: `Alerta por ${a.condicionNombre} (${a.severidad.toLowerCase()})`,
    })),
    ...(alt.alergia
      ? [
          {
            rango: alt.alergia.rango,
            texto: `Cruce de alergia${alt.alergia.grupoNombre ? ` · ${alt.alergia.grupoNombre}` : ''}`,
          },
        ]
      : []),
  ];
}

/** Las limpias primero; después, de lo más grave a lo más leve. */
function agrupar(
  viables: readonly Alternativa[],
): Array<{ rango: RangoGravedad | null; filas: Alternativa[] }> {
  const peorDe = (a: Alternativa): RangoGravedad | null => {
    const l = problemas(a);
    return l.length === 0 ? null : (Math.min(...l.map((p) => p.rango)) as RangoGravedad);
  };

  const orden: Array<RangoGravedad | null> = [null, 0, 1, 2, 3];

  return orden
    .map((rango) => ({ rango, filas: viables.filter((a) => peorDe(a) === rango) }))
    .filter((g) => g.filas.length > 0);
}

function resumen(total: number, limpias: number): string {
  const opciones = `${total} ${total === 1 ? 'opción' : 'opciones'}`;
  return limpias === 0 ? opciones : `${opciones} · ${limpias} sin alertas`;
}
