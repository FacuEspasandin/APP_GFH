import { Stack, useLocalSearchParams } from 'expo-router';

import { useDetalleRestriccion, type DetalleRestriccion } from '@/api/ficha';
import { peldanosHepaticos } from '@/dominio/restricciones';
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
  const { data, isLoading, error, refetch } = useDetalleRestriccion(id, 'hepatico');

  return (
    <>
      <Stack.Screen options={{ title: 'Función hepática' }} />
      <Pantalla>
        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={3}
        >
          {data ? <Contenido f={data} /> : null}
        </ResultadoConsulta>
      </Pantalla>
    </>
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
