import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { useFicha, type Ficha } from '@/api/ficha';
import { nombreFamilia, nombreLegible } from '@/dominio/restricciones';
import { Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { MarcaSinValidar, PieContexto } from '@/ui/restricciones';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import {
  colorEspina,
  RANGO_ETIQUETA,
  RANGO_POR_SEVERIDAD_INTERACCION,
  type SeveridadInteraccion,
} from '@gfh/shared-types';

/**
 * Interacciones conocidas de un fármaco, sin paciente.
 *
 * Agrupadas por regla y por familia. Litio tiene 26 y las 26 comparten el mismo
 * texto —salen de una sola regla contra AINEs, IECA y tiazidas—: listarlas
 * planas repetía la misma frase veintiséis veces y la pantalla no se leía.
 *
 * Sin severidad instanciada: eso depende del paciente y sale en el cockpit.
 */
export default function InteraccionesFarmaco() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useFicha(id);

  return (
    <>
      <Stack.Screen options={{ title: 'Interacciones' }} />
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

function Contenido({ f }: { f: Ficha }) {
  if (f.gruposInteraccion.length === 0) {
    return (
      <Estado
        titulo="Sin interacciones conocidas"
        detalle="El catálogo no tiene reglas donde este fármaco participe. No significa que no existan."
      />
    );
  }

  return (
    <>
      {f.gruposInteraccion.map((g, i) => (
        <Grupo key={`${g.severidad}-${i}`} g={g} />
      ))}

      <MarcaSinValidar />

      <PieContexto>
        Acá no hay paciente, así que no hay severidad instanciada contra nadie:
        estas son las reglas donde el fármaco participa. La gravedad final
        aparece en el cockpit del paciente que lo tenga cargado.
      </PieContexto>
    </>
  );
}

function Grupo({ g }: { g: Ficha['gruposInteraccion'][number] }) {
  const col = useColores();
  const rango = RANGO_POR_SEVERIDAD_INTERACCION[g.severidad as SeveridadInteraccion];
  const color = colorEspina(rango);

  return (
    <View className="mb-4">
      {/* La regla, una sola vez arriba: es lo que comparten todos los de abajo. */}
      <Superficie
        elevacion="media"
        className="mb-2.5 px-3.5 py-3"
        style={{ borderLeftWidth: 5, borderLeftColor: color }}
      >
        <Text
          className="font-mono text-eyebrow uppercase tracking-wider"
          style={{ color }}
        >
          {RANGO_ETIQUETA[rango]} · {g.total} {g.total === 1 ? 'fármaco' : 'fármacos'}
        </Text>
        <Text className="font-sans mt-1.5 text-meta leading-5 text-ink">{g.texto}</Text>
      </Superficie>

      <Eyebrow>Con qué interactúa</Eyebrow>

      {g.familias.map((fam) => (
        <Superficie key={fam.nombre} elevacion="plana" className="mb-2 px-3.5 py-3">
          <View className="mb-2 flex-row items-center">
            <Text className="flex-1 text-fila font-medio text-ink">
              {nombreFamilia(fam.nombre)}
            </Text>
            <View
              className="rounded px-2 py-0.5"
              style={{ backgroundColor: col.paper }}
            >
              <Text className="font-mono-fuerte text-meta" style={{ color }}>
                {fam.miembros.length}
              </Text>
            </View>
          </View>
          <Miembros nombres={fam.miembros} />
        </Superficie>
      ))}

      {g.sueltos.length > 0 ? (
        <Superficie elevacion="plana" className="mb-2 px-3.5 py-3">
          <Text className="mb-2 text-fila font-medio text-ink">
            {/* Los que la regla nombró sueltos, sin familia. No se omiten: la
                ficha mostraría menos interacciones de las que hay. */}
            Otros
          </Text>
          <Miembros nombres={g.sueltos} />
        </Superficie>
      ) : null}
    </View>
  );
}

/** Los primeros seis y un contador: la lista completa no cabe ni hace falta. */
function Miembros({ nombres }: { nombres: readonly string[] }) {
  const visibles = nombres.slice(0, 6);
  const resto = nombres.length - visibles.length;

  return (
    <View className="flex-row flex-wrap" style={{ gap: 5 }}>
      {visibles.map((n) => (
        <View key={n} className="rounded-chip bg-paper px-2.5 py-1">
          <Text className="font-sans text-eyebrow text-ink-suave">{nombreLegible(n)}</Text>
        </View>
      ))}
      {resto > 0 ? (
        <View className="justify-center px-1">
          <Text className="font-sans text-eyebrow text-tenue">y {resto} más</Text>
        </View>
      ) : null}
    </View>
  );
}
