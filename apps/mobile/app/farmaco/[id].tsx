import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { AvisoNeutro, Cargando, Card, Chip, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { colorEspina } from '@gfh/shared-types';
import { useColores } from '@/ui/tema';

interface Ficha {
  id: string;
  nombreComercial: string;
  laboratorio: string | null;
  formaFarmaceutica: string | null;
  dosisTexto: string | null;
  principiosActivos: Array<{ id: string; nombre: string; grupoTerapeutico: string | null }>;
  tieneAjusteRenal: boolean;
  tieneAjusteHepatico: boolean;
  tablasRenales: Array<{
    principioActivo: string;
    via: string;
    dosisFrNormal: string;
    suplementoHd: string | null;
    requiereRevision: boolean;
    rangos: Array<{ rangoTexto: string; textoRecomendacion: string | null; tipo: string }>;
  }>;
  interaccionesConocidas: Array<{ conNombre: string; severidad: string; texto: string }>;
  monografia: null;
}

/** Ficha de fármaco (5.4-5.9), con los 3 tabs del documento funcional §6.4. */
export default function FichaFarmaco() {
  const col = useColores();

  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<'info' | 'tecnica' | 'similares'>('info');

  const { data, isLoading, error } = useQuery({
    queryKey: ['ficha', id],
    queryFn: () => api.get<Ficha>(`/catalogo/productos/${id}`),
    enabled: Boolean(id),
  });

  if (isLoading) return <Cargando />;
  if (error || !data) {
    return (
      <Pantalla>
        <Estado titulo="No se pudo cargar la ficha" detalle={String((error as Error)?.message ?? '')} />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Stack.Screen options={{ title: data.nombreComercial }} />

      <Card className="mb-4 px-3.5 py-3.5">
        <Text className="text-fila font-fuerte text-ink">
          {data.nombreComercial}
          {data.dosisTexto ? <Text className="font-sans text-ink-suave"> · {data.dosisTexto}</Text> : null}
        </Text>
        <Text className="font-sans mt-0.5 text-meta text-ink-suave">
          {data.principiosActivos.map((p) => p.nombre).join(' + ')}
          {data.laboratorio ? ` · ${data.laboratorio}` : ''}
        </Text>
      </Card>

      {/* Segmented control: el activo va en `surface`, no en color de marca —
          si no, compite con el header que ya es verde. */}
      <View className="mb-4 flex-row rounded-chip bg-paper p-1" style={{ borderWidth: 1, borderColor: col.line }}>
        {(['info', 'tecnica', 'similares'] as const).map((t) => (
          <View key={t} className="flex-1">
            <Chip
              texto={t === 'info' ? 'Info' : t === 'tecnica' ? 'Ficha técnica' : 'Similares'}
              activo={tab === t}
              onPress={() => setTab(t)}
            />
          </View>
        ))}
      </View>

      {tab === 'info' ? (
        <>
          <Eyebrow>Restricciones de uso</Eyebrow>
          <View className="mb-4 flex-row flex-wrap gap-2">
            <Restriccion titulo="Renal" tiene={data.tieneAjusteRenal} />
            <Restriccion titulo="Hepático" tiene={data.tieneAjusteHepatico} />
            <Restriccion titulo="Embarazo" tiene={false} />
            <Restriccion titulo="Lactancia" tiene={false} />
          </View>
          <AvisoNeutro>
            Las restricciones de embarazo y lactancia se evalúan contra un paciente concreto, con su
            semana de gestación. Acá no hay paciente, así que no se puede instanciar la severidad.
          </AvisoNeutro>
        </>
      ) : null}

      {tab === 'tecnica' ? (
        data.tablasRenales.length === 0 ? (
          <AvisoNeutro>Este producto no tiene tabla de ajuste renal en el catálogo.</AvisoNeutro>
        ) : (
          data.tablasRenales.map((t, i) => (
            <Card key={i} className="mb-3 px-3.5 py-3">
              <Text className="text-body font-medio text-ink">
                {t.principioActivo}
                <Text className="font-sans text-ink-suave"> · vía {t.via.toLowerCase()}</Text>
              </Text>
              <Text className="font-sans mt-1 text-meta text-ink-suave">Función normal: {t.dosisFrNormal}</Text>
              <View className="mt-2.5">
                {t.rangos.map((r, j) => (
                  <View key={j} className="flex-row border-t border-line py-1.5">
                    <Text className="w-[38%] text-meta font-medio text-ink">{r.rangoTexto}</Text>
                    <Text className="font-sans flex-1 text-meta text-ink-suave">
                      {r.textoRecomendacion ?? '—'}
                    </Text>
                  </View>
                ))}
              </View>
              {t.suplementoHd ? (
                <Text className="font-sans mt-2 text-meta text-ink-suave">Hemodiálisis: {t.suplementoHd}</Text>
              ) : null}
              {t.requiereRevision ? (
                <Text className="font-sans mt-1.5 text-eyebrow uppercase tracking-wider" style={{ color: '#92400E' }}>
                  Entrada marcada para revisión en la fuente
                </Text>
              ) : null}
            </Card>
          ))
        )
      ) : null}

      {tab === 'similares' ? (
        <AvisoNeutro>
          La jerarquía de similares necesita el código ATC, que todavía no está cargado en el
          catálogo. Hasta entonces no se puede armar la lista.
        </AvisoNeutro>
      ) : null}

      {tab === 'info' && data.interaccionesConocidas.length > 0 ? (
        <View className="mt-3">
          <Eyebrow>Interacciones conocidas ({data.interaccionesConocidas.length})</Eyebrow>
          {/* Sin severidad instanciada: acá no hay paciente contra el cual
              medir, sólo las reglas donde el fármaco participa. */}
          {data.interaccionesConocidas.slice(0, 20).map((i, k) => (
            <View
              key={k}
              className="mb-2 rounded-card border border-line bg-surface px-3.5 py-2.5"
              style={{ borderLeftWidth: 4, borderLeftColor: colorEspina(i.severidad === 'CONTRAINDICADA' ? 0 : i.severidad === 'ALTA' ? 1 : 3) }}
            >
              <Text className="text-body font-medio capitalize text-ink">{i.conNombre}</Text>
              <Text className="font-sans text-eyebrow uppercase tracking-wider text-ink-suave">{i.severidad}</Text>
            </View>
          ))}
          {data.interaccionesConocidas.length > 20 ? (
            <Text className="font-sans mb-2 px-1 text-meta text-ink-suave">
              y {data.interaccionesConocidas.length - 20} más
            </Text>
          ) : null}
        </View>
      ) : null}

      {tab === 'info' ? (
        <View className="mt-3">
          <Eyebrow>Monografía</Eyebrow>
          <AvisoNeutro>
            La ficha descriptiva todavía no está conectada. Las interacciones y el ajuste de dosis
            que sí ves salen del motor propio, no de una fuente externa.
          </AvisoNeutro>
        </View>
      ) : null}
    </Pantalla>
  );
}

function Restriccion({ titulo, tiene }: { titulo: string; tiene: boolean }) {
  const col = useColores();

  return (
    <View
      className="min-w-[46%] flex-1 rounded-card border border-line bg-surface px-3 py-2.5"
      style={{ borderLeftWidth: 4, borderLeftColor: tiene ? '#F59E0B' : col.tenue }}
    >
      <Text className="text-meta font-medio text-ink">{titulo}</Text>
      <Text className="font-sans text-eyebrow uppercase tracking-wider text-ink-suave">
        {tiene ? 'Tiene tabla' : 'Sin datos'}
      </Text>
    </View>
  );
}
