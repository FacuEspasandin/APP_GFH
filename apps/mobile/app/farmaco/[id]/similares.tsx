import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useSimilares, type Similares } from '@/api/ficha';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { Pantalla } from '@/ui/kit';
import { MarcadoresAjuste } from '@/ui/marcadores-ajuste';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Otros fármacos de la misma clase (subgrupo químico ATC) — para cuando el
 * médico busca una alternativa sin partir de una interacción puntual.
 *
 * Distinto de "Alternativas" del cockpit (motor §8): eso corre contra UN
 * paciente y descarta lo que le choca; esto es información de catálogo,
 * libre, sin paciente de por medio — el mismo criterio que el resto de la
 * ficha (regla 1: nada clínico instanciado se calcula acá).
 */
export default function Similares() {
  // OJO: a diferencia de los demás hijos de `farmaco/[id]/*` (embarazo,
  // renal, etc.), acá `id` es un PrincipioActivo.id, no un ProductoComercial.
  // ATC es del fármaco, no del envase — un combinado tendría un ATC distinto
  // por componente. Se entra desde un fármaco puntual (Composición o esta
  // misma pantalla, para saltar de similar en similar), nunca desde un id de
  // producto.
  const { id: principioActivoId, nombre } = useLocalSearchParams<{ id: string; nombre?: string }>();
  const { data, isLoading, error, refetch } = useSimilares(principioActivoId);

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoApp />
      <Pantalla>
        <Text className="mb-1 text-[28px] font-fuerte text-ink">Similares</Text>
        <Text className="font-sans mb-4 text-meta leading-5 text-ink-suave">
          Otros fármacos de la misma clase que {nombre ?? 'este'}, por código ATC.
        </Text>

        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={3}
        >
          {data ? <ContenidoSimilares s={data} /> : null}
        </ResultadoConsulta>
      </Pantalla>
    </View>
  );
}

/** Exportado: la pestaña "Similares" de la ficha principal reusa este mismo
 *  contenido para el fármaco único del producto, en vez de duplicarlo. */
export function ContenidoSimilares({ s }: { s: Similares }) {
  const router = useRouter();
  const col = useColores();

  if (s.motivoSinDatos) {
    return (
      <Superficie elevacion="plana" className="px-3.5 py-3">
        <Text className="font-sans text-meta leading-5 text-ink-suave">{s.motivoSinDatos}</Text>
      </Superficie>
    );
  }

  const lista = s.mismoSubgrupo.length > 0 ? s.mismoSubgrupo : s.mismaClase;
  const porGrupoTerapeutico = s.mismoSubgrupo.length === 0 && s.mismaClase.length > 0;

  if (lista.length === 0) {
    return (
      <Superficie elevacion="plana" className="px-3.5 py-3">
        <Text className="font-sans text-meta leading-5 text-ink-suave">
          Ningún otro fármaco del catálogo comparte su clase ({s.codigoATC}).
        </Text>
      </Superficie>
    );
  }

  return (
    <>
      <View className="mb-3 flex-row items-center gap-2">
        <View className="rounded px-2 py-1" style={{ backgroundColor: col.paper }}>
          <Text className="font-mono-fuerte text-meta text-ink">{s.codigoATC}</Text>
        </View>
        {porGrupoTerapeutico ? (
          <Text className="font-sans text-meta text-ink-suave">Por grupo terapéutico</Text>
        ) : null}
      </View>

      <Superficie elevacion="plana">
        {lista.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => router.push(`/farmaco/${p.id}/similares?nombre=${encodeURIComponent(p.nombre)}` as never)}
            accessibilityRole="button"
            className={`flex-row items-center px-3.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}
          >
            <View className="flex-1">
              <Text className="text-body font-medio text-ink">{p.nombre}</Text>
            </View>
            <MarcadoresAjuste renal={p.tieneAjusteRenal} hepatico={p.tieneAjusteHepatico} />
            <Icono nombre="chevron" tamano={15} color={col.tenue} />
          </Pressable>
        ))}
      </Superficie>
    </>
  );
}
