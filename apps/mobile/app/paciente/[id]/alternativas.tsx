import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { Icono } from '@/ui/iconos';
import { AvisoNeutro, Boton, Cargando, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { BadgeConteo } from '@/ui/severidad';
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

/** El verde de "documentada" marca un estado del registro, no gravedad
 *  clínica: por eso no sale de `COLOR_SEVERIDAD`. */
const VERDE_DOCUMENTADA = '#166534';

/** La franja de una alternativa: el peor de los problemas que la tocan. Sin
 *  problemas queda en el verde de la escala, que ahí sí significa "limpia". */
function peorDeLaAlternativa(alt: Alternativa): RangoGravedad | null {
  const rangos: RangoGravedad[] = [
    ...alt.interaccionesPotenciales.map((i) =>
      i.severidad === 'CONTRAINDICADA' ? 0 : i.severidad === 'ALTA' ? 1 : 3,
    ),
    ...alt.alertasCondicion.map(() => 2 as RangoGravedad),
    ...(alt.alergia ? [alt.alergia.rango] : []),
  ];
  return rangos.length === 0 ? null : (Math.min(...rangos) as RangoGravedad);
}

const MOTIVO: Record<string, string> = {
  ALERGIA_BLOQUEA: 'alergia grave registrada a este principio activo',
  CRUCE_FAMILIA_CONTRAINDICADO: 'cruce de familia contraindicado',
  CONDICION_CONTRAINDICADA: 'alerta de condición contraindicada',
};

/**
 * Alternativas terapéuticas (3.6.1).
 *
 * Vienen anotadas contra este paciente y ordenadas de la más limpia a la menos
 * limpia. Elegir una lleva a la pantalla de reemplazo, que pide la pauta y
 * cambia la medicación de verdad — antes esto sólo dejaba registro.
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

  return (
    <Pantalla>
      <Eyebrow>Alternativas a {data.farmacoOrigen}</Eyebrow>

      {data.sinDatos ? <AvisoNeutro>{data.motivo}</AvisoNeutro> : null}

      {!data.sinDatos && data.viables.length === 0 ? (
        <Estado
          titulo="Sin alternativas anotadas"
          detalle="El catálogo no tiene reemplazos para este fármaco. No significa que no existan."
        />
      ) : null}

      {data.viables.map((alt) => (
        <Superficie
          key={alt.paAlternativaId}
          elevacion={alt.totalProblemas === 0 ? 'media' : 'plana'}
          className="mb-2.5 px-3.5 py-3"
          style={{ borderLeftWidth: 4, borderLeftColor: colorEspina(peorDeLaAlternativa(alt)) }}
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="text-body font-medio text-ink">{alt.nombre}</Text>
              {alt.yaAceptada ? (
                <View className="mt-0.5 flex-row items-center gap-1">
                  <Icono nombre="check" tamano={12} color={VERDE_DOCUMENTADA} />
                  <Text
                    className="text-eyebrow font-fuerte uppercase tracking-wider"
                    style={{ color: VERDE_DOCUMENTADA }}
                  >
                    Documentada
                  </Text>
                </View>
              ) : null}
            </View>
            {/* Conteo de problemas: mide cantidad, no gravedad. */}
            <BadgeConteo n={alt.totalProblemas} />
          </View>

          <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">{alt.razon}</Text>

          {alt.interaccionesPotenciales.map((i, k) => (
            <Problema
              key={k}
              color={colorEspina(
                i.severidad === 'CONTRAINDICADA' ? 0 : i.severidad === 'ALTA' ? 1 : 3,
              )}
              texto={`Interactúa con ${i.paNombre} (${i.severidad.toLowerCase()})`}
            />
          ))}

          {alt.alertasCondicion.map((a, k) => (
            <Problema
              key={`c${k}`}
              color={COLOR_SEVERIDAD.media}
              texto={`Alerta por ${a.condicionNombre} (${a.severidad.toLowerCase()})`}
            />
          ))}

          {alt.alergia ? (
            <Problema
              color={colorEspina(alt.alergia.rango)}
              texto={`Cruce de alergia${alt.alergia.grupoNombre ? ` · ${alt.alergia.grupoNombre}` : ''}`}
            />
          ) : null}

          <View className="mt-3">
            <Boton
              variante="secundario"
              onPress={() =>
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
            >
              {`Reemplazar por ${alt.nombre}`}
            </Boton>
          </View>
        </Superficie>
      ))}

      {data.descartadas.length > 0 ? (
        <View className="mt-4">
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
    </Pantalla>
  );
}

function Problema({ color, texto }: { color: string; texto: string }) {
  return (
    <View className="mt-1.5 flex-row items-center gap-2">
      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="font-sans flex-1 text-meta text-ink">{texto}</Text>
    </View>
  );
}
