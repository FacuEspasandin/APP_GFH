import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { useDetalleRestriccion, type DetalleRestriccion } from '@/api/ficha';
import { estadoDeAlertas } from '@/dominio/restricciones';
import { Icono } from '@/ui/iconos';
import { Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { coloresDe, MarcaSinValidar, PieContexto } from '@/ui/restricciones';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Alertas de lactancia de un fármaco, sin paciente.
 *
 * **No se parece a las otras tres, y es a propósito.** La lactancia no se
 * gradúa: no hay tramos de clearance ni trimestres ni clases. O el paciente
 * amamanta o no. Forzarla al mismo molde que el riñón o el embarazo haría creer
 * que tiene grados que no tiene.
 */
export default function RestriccionLactancia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useDetalleRestriccion(id, 'lactancia');

  return (
    <>
      <Stack.Screen options={{ title: 'Lactancia' }} />
      <Pantalla>
        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={2}
        >
          {data ? <Contenido f={data} /> : null}
        </ResultadoConsulta>
      </Pantalla>
    </>
  );
}

function Contenido({ f }: { f: DetalleRestriccion }) {
  const col = useColores();
  const alertas = f.alertas ?? [];
  const estado = estadoDeAlertas(alertas);
  const c = coloresDe(estado, col);
  const alerta = alertas[0];

  return (
    <>
      <Superficie
        elevacion="media"
        className="mb-3.5 items-center px-4 py-5"
        style={{ borderTopWidth: 5, borderTopColor: c.frente }}
      >
        <View
          className="mb-3 items-center justify-center rounded-card"
          style={{ width: 52, height: 52, backgroundColor: c.fondo }}
        >
          <Icono nombre="lactancia" tamano={27} color={c.frente} />
        </View>

        <Text
          className="font-mono-fuerte text-eyebrow uppercase"
          style={{ color: c.frente, letterSpacing: 1.4 }}
        >
          {estado === 'sindato' ? 'Sin datos' : estado === 'evitar' ? 'Evitar' : 'Precaución'}
        </Text>

        <Text className="mt-2 text-center text-fila font-medio leading-6 text-ink">
          {alerta
            ? alerta.texto
            : 'Este fármaco no tiene alertas de lactancia cargadas en el catálogo.'}
        </Text>

        <Text className="font-sans mt-2.5 text-center text-meta leading-5 text-ink-suave">
          {alerta
            ? 'No hay tramos: la lactancia no se gradúa como el embarazo.'
            : 'Que no haya dato no significa que sea seguro.'}
        </Text>

        {alerta ? (
          <View className="mt-4 w-full flex-row border-t border-line pt-4" style={{ gap: 8 }}>
            <View
              className="flex-1 rounded-card border px-3 py-2.5"
              style={{ backgroundColor: c.fondo, borderColor: c.fondo }}
            >
              <Text
                className="font-mono text-eyebrow uppercase tracking-wider"
                style={{ color: c.frente }}
              >
                Amamanta
              </Text>
              <Text className="font-sans mt-1 text-eyebrow leading-4 text-ink-suave">
                La alerta se aplica.
              </Text>
            </View>

            <View className="flex-1 rounded-card border border-line px-3 py-2.5">
              <Text className="font-mono text-eyebrow uppercase tracking-wider text-tenue">
                No, o sin dato
              </Text>
              <Text className="font-sans mt-1 text-eyebrow leading-4 text-ink-suave">
                Queda neutro. No se descarta.
              </Text>
            </View>
          </View>
        ) : null}
      </Superficie>

      {alerta ? <MarcaSinValidar /> : null}

      <PieContexto>
        «Sin dato» y «no amamanta» se ven iguales acá porque en los dos casos el
        motor no aplica la alerta — pero en el paciente sí se distinguen: uno es
        una respuesta y el otro una pregunta sin hacer.
      </PieContexto>
    </>
  );
}
