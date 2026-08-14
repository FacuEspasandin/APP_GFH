import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useFicha, type Ficha } from '@/api/ficha';
import { restriccionesDe, type ClaveRestriccion } from '@/dominio/restricciones';
import { Icono } from '@/ui/iconos';
import { Chip, Eyebrow, Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { GrillaRestricciones } from '@/ui/restricciones';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { colorEspina, RANGO_POR_SEVERIDAD_INTERACCION } from '@gfh/shared-types';

/**
 * Ficha de fármaco (5.4-5.9).
 *
 * Sin pestañas. Antes eran tres —técnica, ajuste, interacciones— y el problema
 * no era la barra sino qué quedaba adentro: «Ajuste» tenía renal y hepático y
 * nada de embarazo ni lactancia, así que dos de los cuatro marcadores de
 * restricción no llevaban a ningún lado y estaban apagados a la fuerza.
 *
 * Ahora la ficha es una sola página con la grilla de restricciones arriba, y
 * cada una abre su propia pantalla. La barra de pestañas sobra: las cuatro
 * tarjetas ya dicen qué hay en cada una antes de tocarla.
 *
 * "Similares" sigue sin estar: necesita el código ATC, que no está cargado.
 */
export default function FichaFarmaco() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useFicha(id);

  const abrir = (clave: ClaveRestriccion) => router.push(`/farmaco/${id}/${clave}` as never);

  return (
    <>
      <Stack.Screen options={{ title: data?.nombreComercial ?? 'Fármaco' }} />
      <Pantalla>
        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={4}
        >
          {data ? (
            <>
              <Encabezado f={data} />

              <Eyebrow>Restricciones</Eyebrow>
              <GrillaRestricciones restricciones={restriccionesDe(data)} onAbrir={abrir} />

              <FilaInteracciones
                f={data}
                onPress={() => router.push(`/farmaco/${id}/interacciones` as never)}
              />

              <Composicion f={data} />
            </>
          ) : null}
        </ResultadoConsulta>
      </Pantalla>
    </>
  );
}

function Encabezado({ f }: { f: Ficha }) {
  return (
    <View className="mb-3.5 rounded-card bg-primary-light px-3.5 py-3.5">
      <Text className="text-grande font-fuerte text-ink">
        {f.nombreComercial}
        {f.dosisTexto ? <Text className="font-sans text-ink-suave"> {f.dosisTexto}</Text> : null}
      </Text>
      <Text className="font-sans mt-1 text-meta text-ink-suave">
        {[f.formaFarmaceutica, f.laboratorio].filter(Boolean).join(' · ') ||
          'Sin datos de presentación'}
      </Text>
      <View className="mt-2.5 flex-row flex-wrap gap-1.5">
        {f.principiosActivos.map((p) => (
          <Chip key={p.id} texto={p.nombre} />
        ))}
      </View>
    </View>
  );
}

/**
 * Las interacciones van en una fila y no en la grilla: no son una restricción
 * del fármaco contra un estado del paciente, son el fármaco contra otros
 * fármacos. Mezclarlas en las cuatro tarjetas borraría esa diferencia.
 */
function FilaInteracciones({ f, onPress }: { f: Ficha; onPress: () => void }) {
  const col = useColores();
  const total = f.interaccionesConocidas.length;

  const peor = f.gruposInteraccion[0];
  const color = peor
    ? colorEspina(RANGO_POR_SEVERIDAD_INTERACCION[peor.severidad])
    : col.tenue;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Interacciones, ${total}`}
      className="mb-4 flex-row items-center rounded-card border border-line bg-surface px-3.5 py-3"
    >
      <Text className="flex-1 text-fila font-medio text-ink">Interacciones</Text>
      {total > 0 ? (
        <View className="mr-2 rounded px-2 py-0.5" style={{ backgroundColor: col.paper }}>
          <Text className="font-mono-fuerte text-meta" style={{ color }}>
            {total}
          </Text>
        </View>
      ) : (
        <Text className="font-sans mr-2 text-meta text-tenue">Ninguna conocida</Text>
      )}
      <Icono nombre="chevron" tamano={15} color={col.tenue} />
    </Pressable>
  );
}

function Composicion({ f }: { f: Ficha }) {
  const familias = [
    ...new Set(f.principiosActivos.map((p) => p.grupoTerapeutico).filter(Boolean)),
  ] as string[];

  return (
    <>
      <Eyebrow>Composición</Eyebrow>
      <Superficie elevacion="plana" className="mb-4">
        {f.principiosActivos.map((p, i) => (
          <View key={p.id} className={`px-3.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}>
            <Text className="text-body font-medio text-ink">{p.nombre}</Text>
            <Text className="font-sans text-meta text-ink-suave">
              {p.grupoTerapeutico ?? 'Sin grupo terapéutico en el catálogo'}
            </Text>
          </View>
        ))}
      </Superficie>

      {familias.length > 0 ? (
        <>
          <Eyebrow>Familia para alergias</Eyebrow>
          <Superficie elevacion="plana" className="mb-4 px-3.5 py-3">
            <Text className="text-body font-medio text-ink">{familias.join(' · ')}</Text>
            <Text className="font-sans mt-1 text-meta leading-4 text-ink-suave">
              Una alergia cargada a esta familia hace que el fármaco pida confirmación al agregarlo
              a un paciente. Sólo la coincidencia exacta con severidad grave bloquea.
            </Text>
          </Superficie>
        </>
      ) : null}

      <Eyebrow>Monografía</Eyebrow>
      <Superficie elevacion="plana" className="mb-4 px-3.5 py-3">
        <Text className="font-sans text-meta leading-4 text-ink-suave">
          La ficha descriptiva todavía no está conectada. El ajuste de dosis y las interacciones
          que sí ves salen del motor propio.
        </Text>
      </Superficie>
    </>
  );
}
