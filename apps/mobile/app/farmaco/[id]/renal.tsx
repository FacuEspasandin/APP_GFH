import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useDetalleRestriccion, type DetalleRestriccion } from '@/api/ficha';
import { tramosRenales } from '@/dominio/restricciones';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { AvisoPeligro, Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import {
  EscalaRenal,
  MarcaSinValidar,
  PieContexto,
  TapaRestriccion,
} from '@/ui/restricciones';
import { useColores } from '@/ui/tema';

/**
 * Ajuste renal de un fármaco, sin paciente.
 *
 * El clearance es un eje continuo y la dosis se encoge a medida que baja, así
 * que se dibuja como escala y no como lista: la barra de cada tramo ES la
 * dosis que queda. Tres renglones sueltos con un semáforo al costado tiran esa
 * información.
 */
export default function RestriccionRenal() {
  const col = useColores();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useDetalleRestriccion(id, 'renal');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <Pantalla>
        <EncabezadoAjusteRenal />

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
            onPress={() => router.push('/herramientas/clcr')}
            accessibilityRole="button"
            className="flex-row items-center gap-2 rounded-full px-6 py-2.5"
            style={{ backgroundColor: col.primary }}
          >
            <Icono nombre="calculadora" tamano={16} color={col.onPrimary} />
            <Text className="text-meta font-medio text-on-primary">Calcular Clcr</Text>
          </Pressable>
        </View>
      </Pantalla>
    </>
  );
}

function EncabezadoAjusteRenal() {
  const col = useColores();

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Icono nombre="gota" tamano={20} color={col.info} />
        <Text className="text-titular font-extra text-ink">Ajuste Renal</Text>
      </View>
      <Text className="text-body leading-6 text-ink-suave">
        Ajuste de dosis basado en el aclaramiento de creatinina (Clcr) estimado.
      </Text>
    </View>
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

  const hayContraindicado = tablas.some((t) =>
    tramosRenales(t).some((tr) => tr.estado === 'evitar'),
  );

  return (
    <>
      {hayContraindicado ? <AlertaRenalCritica /> : null}

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

function AlertaRenalCritica() {
  const col = useColores();
  return (
    <AvisoPeligro
      className="mb-4"
      titulo="Ajuste crítico"
      detalle="Al menos un tramo de este fármaco está marcado para evitar en insuficiencia renal. Revisá el detalle de cada rango antes de indicarlo."
    />
  );
}
