import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { Cockpit } from '@/api/tipos';
import { Boton, Cargando, Estado, Eyebrow } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { COLOR_SEVERIDAD, partesClaveAlerta } from '@gfh/shared-types';

interface Datos {
  condiciones: Array<{ id: string; codigo: string; nombre: string; observaciones: string | null }>;
  alergias: Array<{
    id: string;
    tipo: string;
    severidad: 'LEVE' | 'MODERADA' | 'GRAVE';
    nombre: string;
    grupo: string | null;
    cruza: boolean;
  }>;
}

/** Condiciones y alergias activas (3.4.4), con la opción de quitarlas. */
export default function CondicionesYAlergias() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['condiciones-alergias', pacienteId],
    queryFn: () => api.get<Datos>(`/perfil/pacientes/${pacienteId}/condiciones-alergias`),
    enabled: Boolean(pacienteId),
  });

  // El cockpit ya está en caché por haber entrado al paciente. De ahí sale con
  // cuántos fármacos cruza cada condición, sin pedirle nada más al servidor.
  const { data: cockpit } = useQuery({
    queryKey: ['cockpit', pacienteId],
    queryFn: () => api.get<Cockpit>(`/pacientes/${pacienteId}/cockpit`),
    enabled: Boolean(pacienteId),
  });

  const cruces = contarCrucesPorCondicion(cockpit);
  // Con el cockpit cargado, "no está en el mapa" significa cero cruces — que es
  // un dato, no un dato faltante.
  const crucesListos = cockpit !== undefined;

  const invalidar = async () => {
    await qc.invalidateQueries({ queryKey: ['condiciones-alergias', pacienteId] });
    await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
  };

  const quitarCondicion = useMutation({
    mutationFn: (condicionId: string) =>
      api.delete(`/pacientes/${pacienteId}/condiciones/${condicionId}`),
    onSuccess: invalidar,
  });

  const quitarAlergia = useMutation({
    mutationFn: (alergiaId: string) => api.delete(`/alergias/${alergiaId}`),
    onSuccess: invalidar,
  });

  const confirmar = (titulo: string, mensaje: string, accion: () => void) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: accion },
    ]);

  if (isLoading) return <Cargando />;

  const condiciones = data?.condiciones ?? [];
  const alergias = data?.alergias ?? [];
  const sinNada = condiciones.length === 0 && alergias.length === 0;

  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="px-4 pb-4 pt-3">
        {sinNada ? (
          <Estado
            titulo="Sin condiciones ni alergias"
            detalle="Cargalas para que se crucen con la medicación."
          />
        ) : null}

        {condiciones.length > 0 ? (
          <>
            <Eyebrow>Condiciones · {condiciones.length}</Eyebrow>
            {condiciones.map((c) => (
              <Fila
                key={c.id}
                nombre={c.nombre}
                meta={c.observaciones ?? textoCruces(cruces[c.id], crucesListos)}
                color={COLOR_SEVERIDAD.neutro}
                onQuitar={() =>
                  confirmar(
                    'Quitar condición',
                    `${c.nombre} deja de cruzarse con la medicación.`,
                    () => quitarCondicion.mutate(c.id),
                  )
                }
              />
            ))}
          </>
        ) : null}

        {alergias.length > 0 ? (
          <>
            <View className="mt-3" />
            <Eyebrow>Alergias · {alergias.length}</Eyebrow>
            {alergias.map((a) => (
              <Fila
                key={a.id}
                nombre={a.nombre}
                meta={a.grupo}
                color={colorAlergia(a.severidad)}
                consecuencia={consecuencia(a)}
                onQuitar={() =>
                  confirmar('Quitar alergia', `${a.nombre} deja de evaluarse.`, () =>
                    quitarAlergia.mutate(a.id),
                  )
                }
              />
            ))}
          </>
        ) : null}

        {alergias.length > 0 ? (
          <Superficie elevacion="plana" className="mb-3 mt-2 px-3.5 py-3">
            {/* Regla 4, dicha donde se ve la consecuencia y no sólo en el motor. */}
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              Sólo la coincidencia exacta con una alergia grave impide prescribir. El cruce por
              familia nunca bloquea: pide que lo confirmes.
            </Text>
          </Superficie>
        ) : null}

        {alergias.some((a) => !a.cruza) ? (
          <Superficie elevacion="plana" className="mb-3 px-3.5 py-3">
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              Una alergia que no cruza quedó registrada pero no coincide con ninguna familia
              conocida, así que no dispara alertas.
            </Text>
          </Superficie>
        ) : null}
      </ScrollView>

      {/* Al pie y no al final del scroll: con seis condiciones cargadas, agregar
          la séptima obligaba a recorrer la lista entera. */}
      <View className="flex-row gap-2.5 border-t border-line bg-surface px-4 py-3">
        <View className="flex-1">
          <Boton
            variante="secundario"
            onPress={() => router.push(`/paciente/${pacienteId}/agregar-condicion` as never)}
          >
            Agregar condición
          </Boton>
        </View>
        <View className="flex-1">
          <Boton
            variante="secundario"
            onPress={() => router.push(`/paciente/${pacienteId}/agregar-alergia` as never)}
          >
            Agregar alergia
          </Boton>
        </View>
      </View>
    </View>
  );
}

function Fila({
  nombre,
  meta,
  color,
  consecuencia,
  onQuitar,
}: {
  nombre: string;
  meta?: string | null;
  color: string;
  consecuencia?: { texto: string; fondo: string; tinta: string };
  onQuitar: () => void;
}) {
  const col = useColores();

  return (
    <Superficie
      elevacion="plana"
      className="mb-2 flex-row items-center px-3.5 py-3"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <View className="flex-1 pr-2">
        <Text className="text-body font-medio text-ink">{nombre}</Text>
        {meta ? (
          <Text className="font-sans mt-0.5 text-meta text-ink-suave">{meta}</Text>
        ) : null}

        {consecuencia ? (
          <View
            className="mt-1.5 self-start rounded-full px-2 py-0.5"
            style={{ backgroundColor: consecuencia.fondo }}
          >
            <Text
              className="font-fuerte text-eyebrow uppercase tracking-wider"
              style={{ color: consecuencia.tinta }}
            >
              {consecuencia.texto}
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable onPress={onQuitar} accessibilityRole="button" accessibilityLabel={`Quitar ${nombre}`}>
        <Text className="font-medio text-meta" style={{ color: col.peligro }}>
          Quitar
        </Text>
      </Pressable>
    </Superficie>
  );
}

/**
 * Qué pasa al recetar algo relacionado, en vez de la severidad cruda.
 *
 * Antes decía "grave" o "moderada" en minúscula. Lo que el médico necesita no
 * es la etiqueta de la alergia sino su consecuencia — y es exactamente lo que
 * dice la regla 4: sólo la exacta y grave bloquea.
 */
function consecuencia(a: Datos['alergias'][number]) {
  if (!a.cruza) {
    return { texto: 'No cruza con fármacos', fondo: '#EFF2EF', tinta: '#5C6B64' };
  }
  if (a.tipo === 'EXACTA' && a.severidad === 'GRAVE') {
    return { texto: 'Impide prescribir', fondo: '#FEE2E2', tinta: '#991B1B' };
  }
  return { texto: 'Pide confirmación', fondo: '#FEF3C7', tinta: '#92400E' };
}

function colorAlergia(severidad: Datos['alergias'][number]['severidad']): string {
  if (severidad === 'GRAVE') return COLOR_SEVERIDAD.grave;
  if (severidad === 'MODERADA') return COLOR_SEVERIDAD.media;
  return COLOR_SEVERIDAD.neutro;
}

/**
 * Cuántos fármacos del tratamiento toca cada condición.
 *
 * Sale de los hallazgos que el cockpit ya calculó: la clave de una alerta
 * incluye el id de la condición y el de la prescripción, así que agrupar
 * alcanza. Se cuentan prescripciones distintas y no hallazgos — una condición
 * con dos alertas sobre el mismo fármaco toca un fármaco.
 */
function contarCrucesPorCondicion(cockpit?: Cockpit): Record<string, number> {
  if (!cockpit) return {};

  const porCondicion = new Map<string, Set<string>>();

  for (const h of cockpit.hallazgos) {
    if (h.categoria !== 'CONDICION') continue;
    const partes = partesClaveAlerta(h.clave);
    if (!partes || partes.origen !== 'CONDICION') continue;

    const set = porCondicion.get(partes.condicionId) ?? new Set<string>();
    set.add(partes.prescripcionId);
    porCondicion.set(partes.condicionId, set);
  }

  return Object.fromEntries([...porCondicion].map(([id, set]) => [id, set.size]));
}

/**
 * Sin línea mientras el cockpit no llegó: un "cruza con 0" durante la carga
 * sería falso. Una vez cargado, cero cruces se dice — una condición que no toca
 * nada del tratamiento actual es información útil, no ausencia de información.
 */
function textoCruces(n: number | undefined, cargado: boolean): string | null {
  if (!cargado) return null;

  const cuantos = n ?? 0;
  if (cuantos === 0) return 'No cruza con el tratamiento actual';
  return cuantos === 1
    ? 'Cruza con 1 fármaco del tratamiento'
    : `Cruza con ${cuantos} fármacos del tratamiento`;
}
