import { Stack, useLocalSearchParams } from 'expo-router';

import { useDetalleRestriccion, type DetalleRestriccion } from '@/api/ficha';
import { estadoDeAlertas, porTrimestre } from '@/dominio/restricciones';
import { Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import {
  LineaEmbarazo,
  MarcaSinValidar,
  PieContexto,
  TapaRestriccion,
} from '@/ui/restricciones';

/**
 * Alertas de embarazo de un fármaco, sin paciente.
 *
 * El embarazo es una línea de tiempo, no una lista: con los tres trimestres
 * dibujados a escala se ve dónde está el peligro antes de leer una palabra.
 *
 * El catálogo guarda cada alerta con su rango de semanas —o sin rango, que
 * significa todo el embarazo—. Repartirlas por trimestre no agrega contenido
 * clínico: es lo mismo que hace el motor cuando filtra por la semana del
 * paciente, sólo que acá se muestran las tres a la vez.
 */
export default function RestriccionEmbarazo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useDetalleRestriccion(id, 'embarazo');

  return (
    <>
      <Stack.Screen options={{ title: 'Embarazo' }} />
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
  const alertas = f.alertas ?? [];
  const estado = estadoDeAlertas(alertas);

  if (alertas.length === 0) {
    return (
      <>
        <TapaRestriccion
          clave="embarazo"
          titulo="Embarazo"
          veredicto="Sin datos en el catálogo"
          estado="sindato"
        />
        <PieContexto>
          Este fármaco no tiene alertas de embarazo cargadas. Que no haya dato no
          significa que sea seguro: significa que no lo sabemos.
        </PieContexto>
      </>
    );
  }

  const trimestres = porTrimestre(alertas);
  const peor = trimestres.find((t) => t.estado === 'evitar');

  return (
    <>
      <TapaRestriccion
        clave="embarazo"
        titulo="Embarazo"
        veredicto={peor ? `Evitar en el ${peor.nombre.toLowerCase()}` : 'Precaución durante el embarazo'}
        estado={estado}
      />

      <LineaEmbarazo trimestres={trimestres} />

      <MarcaSinValidar />

      <PieContexto>
        Con un paciente cargado, GFH deja sólo la alerta que aplica a su semana
        de gestación. Acá, sin paciente, se muestran los tres tramos.
      </PieContexto>
    </>
  );
}
