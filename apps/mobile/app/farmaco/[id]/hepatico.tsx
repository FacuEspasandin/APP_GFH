import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useDetalleRestriccion, type DetalleRestriccion } from '@/api/ficha';
import { peldanosHepaticos } from '@/dominio/restricciones';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { PeldanosHepaticos, PieContexto, TapaRestriccion } from '@/ui/restricciones';

/**
 * Ajuste hepático de un fármaco, sin paciente.
 *
 * Child-Pugh es una escalera de gravedad, así que se dibuja como escalera: A
 * abajo, C arriba, cada peldaño un poco más adentro. Como lista, las tres
 * clases parecerían alternativas del mismo rango en vez de una progresión.
 *
 * Hoy los tres peldaños salen vacíos —no hay tabla hepática para ningún fármaco
 * en el catálogo— y se muestran igual, punteados. Esconderlos haría creer que
 * el fármaco no necesita ajuste; mostrarlos vacíos dice que la pregunta existe
 * y la respuesta falta.
 */
export default function RestriccionHepatica() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useDetalleRestriccion(id, 'hepatico');

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoApp />
      <Pantalla>
        <EncabezadoAjusteHepatico />

        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={3}
        >
          {data ? <Contenido f={data} /> : null}
        </ResultadoConsulta>

        <View className="mt-2 flex-row justify-end">
          <Pressable
            onPress={() => router.push('/herramientas/hepatico')}
            accessibilityRole="button"
            className="flex-row items-center gap-2 rounded-full px-6 py-2.5"
            style={{ backgroundColor: '#005228' }}
          >
            <Icono nombre="calculadora" tamano={16} color="#FFFFFF" />
            <Text className="text-meta font-medio text-white">Calcular Child-Pugh</Text>
          </Pressable>
        </View>
      </Pantalla>
    </View>
  );
}

function EncabezadoAjusteHepatico() {
  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Icono nombre="higado" tamano={20} color="#B45309" />
        <Text className="text-[28px] font-fuerte text-ink">Ajuste Hepático</Text>
      </View>
      <Text className="text-body leading-6 text-ink-suave">
        Ajuste de dosis según la clase de Child-Pugh del paciente.
      </Text>
    </View>
  );
}

function Contenido({ f }: { f: DetalleRestriccion }) {
  // El catálogo todavía no devuelve filas hepáticas por fármaco: los tres
  // peldaños salen sin dato hasta que exista la tabla.
  const filas = f.tablasHepaticas ?? [];
  const peldanos = peldanosHepaticos(filas);
  const hayTabla = filas.length > 0;

  return (
    <>
      <TapaRestriccion
        clave="hepatico"
        titulo="Función hepática"
        veredicto={hayTabla ? 'Por clase de Child-Pugh' : 'Sin datos en el catálogo'}
        estado={hayTabla ? 'ajustar' : 'sindato'}
      />

      <PeldanosHepaticos peldanos={peldanos} />

      <PieContexto>
        La clase del paciente sale de la calculadora de Child-Pugh, que ya está
        hecha. Lo que falta es esta tabla, por fármaco: sin ella el ajuste
        hepático del cockpit queda en neutro.
      </PieContexto>
    </>
  );
}
