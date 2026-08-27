import { MotiView } from 'moti';
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
 *
 * **Nunca insinúa contenido.** Son rectángulos grises: no llevan color de
 * severidad, ni cifras, ni un anillo a medio llenar. Un esqueleto verde
 * mientras carga un cockpit sería afirmar que no hay hallazgos medio segundo
 * antes de saberlo — la regla 5 otra vez.
 *
 * El pulso es lento a propósito. Rápido se lee como algo que parpadea porque
 * falla; lento, como algo que viene en camino.
 */

const MS_PULSO = 1100;

/** Un bloque que respira. Todo lo demás son composiciones de esto. */
function Bloque({
  alto,
  ancho = '100%',
  redondeo = 8,
  margenAbajo = 0,
}: {
  alto: number;
  ancho?: number | `${number}%`;
  redondeo?: number;
  margenAbajo?: number;
}) {
  const col = useColores();
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 0.85 }}
      transition={{ type: 'timing', duration: MS_PULSO, loop: true, repeatReverse: true }}
      style={{
        height: alto,
        width: ancho,
        borderRadius: redondeo,
        marginBottom: margenAbajo,
        backgroundColor: col.line,
      }}
    />
  );
}

/**
 * Una fila de lista: nombre, detalle y la cifra de la derecha.
 *
 * Los anchos son disparejos —70 %, 45 %— porque bloques de ancho completo se
 * leen como una tabla y no como texto.
 */
function FilaFantasma() {
  const col = useColores();
  return (
    <View
      className="mb-2.5 flex-row items-center rounded-card border border-line bg-surface px-3.5 py-3.5"
      style={{ borderLeftWidth: 4, borderLeftColor: col.line }}
    >
      <View className="flex-1 pr-4">
        <Bloque alto={15} ancho="70%" margenAbajo={8} />
        <Bloque alto={11} ancho="45%" />
      </View>
      <Bloque alto={22} ancho={54} />
    </View>
  );
}

/**
 * La forma del cockpit: encabezado, las cuatro categorías y el tratamiento.
 *
 * Es la pantalla que más tarda —el motor recalcula todo— y donde más se nota
 * la diferencia contra un spinner.
 */
export function Skeleton({ filas = 3 }: { filas?: number }) {
  return (
    <View className="px-4 pt-3">
      <View className="mb-3.5 rounded-card border border-line bg-surface px-3.5 py-4">
        <Bloque alto={18} ancho="55%" margenAbajo={10} />
        <Bloque alto={12} ancho="35%" />
      </View>

      <Bloque alto={11} ancho="30%" margenAbajo={10} />
      <View className="mb-4 flex-row flex-wrap justify-between">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className="mb-2.5 rounded-card border border-line bg-surface px-3.5 py-3.5"
            style={{ width: '48.5%' }}
          >
            <Bloque alto={12} ancho="80%" margenAbajo={10} />
            <Bloque alto={20} ancho={30} />
          </View>
        ))}
      </View>

      {Array.from({ length: filas }, (_, i) => (
        <FilaFantasma key={i} />
      ))}
    </View>
  );
}

/** Sólo filas: listas de pacientes, grupos, sesiones, historial. */
export function SkeletonLista({ filas = 5 }: { filas?: number }) {
  return (
    <View className="px-4 pt-3">
      {Array.from({ length: filas }, (_, i) => (
        <FilaFantasma key={i} />
      ))}
    </View>
  );
}

/** Un formulario: rótulo corto y campo, repetido. */
export function SkeletonFormulario({ campos = 4 }: { campos?: number }) {
  return (
    <View className="px-4 pt-3">
      {Array.from({ length: campos }, (_, i) => (
        <View key={i} className="mb-4">
          <Bloque alto={10} ancho="28%" margenAbajo={8} />
          <Bloque alto={44} redondeo={10} />
        </View>
      ))}
    </View>
  );
}
