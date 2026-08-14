import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';

import { useDetalleRestriccion, type DetalleRestriccion } from '@/api/ficha';
import { tramosRenales } from '@/dominio/restricciones';
import { Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import {
  EscalaRenal,
  MarcaSinValidar,
  PieContexto,
  TapaRestriccion,
} from '@/ui/restricciones';

/**
 * Ajuste renal de un fármaco, sin paciente.
 *
 * El clearance es un eje continuo y la dosis se encoge a medida que baja, así
 * que se dibuja como escala y no como lista: la barra de cada tramo ES la
 * dosis que queda. Tres renglones sueltos con un semáforo al costado tiran esa
 * información.
 */
export default function RestriccionRenal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useDetalleRestriccion(id, 'renal');

  return (
    <>
      <Stack.Screen options={{ title: 'Función renal' }} />
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
  const tablas = f.tablasRenales ?? [];

  if (tablas.length === 0) {
    return (
      <>
        <TapaRestriccion
          clave="renal"
          titulo="Función renal"
          veredicto="Sin datos en el catálogo"
          estado="sindato"
        />
        <PieContexto>
          Este producto no tiene tabla de ajuste renal cargada. Que no haya dato
          no significa que no haga falta ajustar: significa que no lo sabemos.
        </PieContexto>
      </>
    );
  }

  return (
    <>
      {tablas.map((tabla, i) => (
        <Fragment key={`${tabla.principioActivo}-${i}`}>
          <TapaRestriccion
            clave="renal"
            titulo={tabla.principioActivo}
            veredicto={`Dosis habitual · ${tabla.dosisFrNormal}`}
            estado="ajustar"
          />
          <EscalaRenal tramos={tramosRenales(tabla)} />
        </Fragment>
      ))}

      <MarcaSinValidar />

      <PieContexto>
        Con un paciente cargado, GFH enciende sólo el tramo que le toca por su
        Clcr y apaga los demás.
      </PieContexto>
    </>
  );
}
