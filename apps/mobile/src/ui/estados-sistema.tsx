import { Text, View } from 'react-native';

import { Icono } from './iconos';
import { Boton } from './kit';
import { useColores } from './tema';

/**
 * Estados de sistema (7.1-7.3).
 *
 * Sin conexión y error genérico son la misma estructura con distinto texto, y
 * la diferencia importa: "no hay internet" es accionable por el usuario, "algo
 * falló del otro lado" no. Mezclarlos hace que el médico reintente en vano.
 */

export function SinConexion({ onReintentar }: { onReintentar: () => void }) {
  const col = useColores();
  return (
    <View className="flex-1 items-center justify-center bg-paper px-8">
      <Icono nombre="sinConexion" tamano={40} color={col.tenue} />
      <Text className="mt-5 text-center text-fila font-fuerte text-ink">Sin conexión</Text>
      <Text className="font-sans mt-2 text-center text-meta leading-5 text-ink-suave">
        Revisá el wifi o los datos. La app necesita conexión: los cálculos se hacen en el servidor
        para que sean los mismos en todos lados.
      </Text>
      <View className="mt-5 w-full max-w-[220px]">
        <Boton onPress={onReintentar}>Reintentar</Boton>
      </View>
    </View>
  );
}

export function ErrorGenerico({ onReintentar, detalle }: { onReintentar: () => void; detalle?: string }) {
  const col = useColores();
  return (
    <View className="flex-1 items-center justify-center bg-paper px-8">
      <Icono nombre="alerta" tamano={40} color={col.tenue} />
      <Text className="mt-5 text-center text-fila font-fuerte text-ink">Algo falló</Text>
      <Text className="font-sans mt-2 text-center text-meta leading-5 text-ink-suave">
        {detalle ?? 'No pudimos completar la operación. Probá de nuevo en un momento.'}
      </Text>
      <View className="mt-5 w-full max-w-[220px]">
        <Boton onPress={onReintentar}>Reintentar</Boton>
      </View>
    </View>
  );
}

/**
 * Skeleton (7.3). Bloques del tamaño del contenido real, para que la pantalla
 * no salte cuando llega el dato.
 */
export function Skeleton({ filas = 3 }: { filas?: number }) {
  const col = useColores();
  return (
    <View className="px-4 pt-3">
      <View className="mb-5 h-24 rounded-card bg-surface opacity-60" />
      <View className="mb-2 h-3 w-24 rounded bg-surface opacity-60" />
      <View className="mb-5 flex-row flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className="h-14 min-w-[47%] flex-1 rounded-card bg-surface opacity-60" />
        ))}
      </View>
      {Array.from({ length: filas }, (_, i) => (
        <View key={i} className="mb-2 h-16 rounded-card bg-surface opacity-60" />
      ))}
    </View>
  );
}
