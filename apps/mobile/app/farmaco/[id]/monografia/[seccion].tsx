import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { SECCIONES_MONOGRAFIA, type ClaveSeccion } from '@gfh/shared-types';

import { useFicha } from '@/api/ficha';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Pantalla } from '@/ui/kit';
import { SelloSeccion, TextoSeccion } from '@/ui/monografia';
import { ResultadoConsulta } from '@/ui/resultado-consulta';

/**
 * Una sección de la monografía, para leer.
 *
 * Es la única pantalla del fármaco que no calcula nada: no hay paciente, no
 * hay severidad, no hay tramos. Es texto. Por eso tampoco descuenta cupo — lo
 * que se paga es el motor, y acá el motor no interviene.
 *
 * Y por eso tampoco usa la escala clínica de colores: el único acento es el
 * primario. Ver `@/ui/monografia`.
 */
export default function SeccionMonografia() {
  const { id, seccion } = useLocalSearchParams<{ id: string; seccion: string }>();
  const { data, isLoading, error, refetch } = useFicha(id);

  const clave = seccion as ClaveSeccion;
  const meta = SECCIONES_MONOGRAFIA.find((s) => s.clave === clave);

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo={meta?.titulo ?? 'Monografía'} />
      <Pantalla>
        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={4}
        >
          {data ? <Contenido monografias={data.monografias} clave={clave} /> : null}
        </ResultadoConsulta>
      </Pantalla>
    </View>
  );
}

function Contenido({
  monografias,
  clave,
}: {
  monografias: { principioActivo: string; secciones: { clave: string; texto: string }[] }[];
  clave: ClaveSeccion;
}) {
  const meta = SECCIONES_MONOGRAFIA.find((s) => s.clave === clave);

  // En una asociación cada componente trae su propia monografía, así que la
  // sección puede existir dos veces con textos distintos. Se muestran las dos,
  // separadas por el nombre — fusionarlas perdería de cuál habla cada frase.
  const conTexto = monografias
    .map((m) => ({
      principioActivo: m.principioActivo,
      texto: m.secciones.find((s) => s.clave === clave)?.texto,
    }))
    .filter((m): m is { principioActivo: string; texto: string } => Boolean(m.texto));

  if (conTexto.length === 0) {
    return (
      <View className="rounded-card border border-line bg-surface px-3.5 py-4">
        <Text className="font-sans text-body leading-5 text-ink-suave">
          Esta sección no está cargada para este fármaco.
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* La tapa dice de qué fármaco es lo que sigue. Sin ella, tres secciones
          abiertas una atrás de otra se confunden entre sí: el título del header
          dice la sección, no el fármaco. */}
      <View className="mb-4 flex-row items-center">
        <SelloSeccion clave={clave} grande />
        <View className="ml-3 flex-1">
          <Text className="text-titulo font-fuerte text-ink">{meta?.titulo}</Text>
          <Text className="font-sans mt-0.5 text-meta leading-4 text-ink-suave">
            {conTexto.map((m) => m.principioActivo).join(' · ')}
          </Text>
        </View>
      </View>

      {conTexto.map((m, i) => (
        <View key={m.principioActivo} className={i === 0 ? '' : 'mt-5'}>
          {conTexto.length > 1 ? (
            <Text className="mb-2 text-fila font-medio text-ink">{m.principioActivo}</Text>
          ) : null}
          <TextoSeccion texto={m.texto} />
        </View>
      ))}

      <Text className="font-sans mt-5 text-meta leading-4 text-tenue">
        Texto descriptivo del fármaco. Lo que se cruza contra el paciente son
        las restricciones y las interacciones de la ficha.
      </Text>
    </>
  );
}
