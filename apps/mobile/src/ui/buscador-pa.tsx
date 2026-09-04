import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useIndicePrincipiosActivos } from '@/api/catalogo';
import { buscar, POR_NOMBRE } from '@/dominio/busqueda';
import { Icono } from './iconos';
import { useColores } from './tema';

export interface PaSugerido {
  id: string;
  nombre: string;
  grupoTerapeutico: string | null;
  tieneAjusteRenal: boolean;
}

/**
 * Autocomplete de principio activo con lista de seleccionados.
 *
 * Las herramientas trabajan a nivel de principio activo y no de producto
 * comercial: acá no hay prescripción, hay un chequeo puntual. El Buscador y la
 * carga de tratamiento sí van por producto (regla no negociable 10).
 *
 * Los 631 principios activos se bajan una vez —91 KB— y se filtran acá. Antes
 * era una petición por tecla a partir de la segunda letra; ahora las
 * sugerencias salen con la primera y al ritmo del dedo.
 */
export function BuscadorPrincipioActivo({
  seleccionados,
  onAgregar,
  onQuitar,
  unico,
}: {
  seleccionados: PaSugerido[];
  onAgregar: (pa: PaSugerido) => void;
  onQuitar: (id: string) => void;
  unico?: boolean;
}) {
  const col = useColores();

  const [consulta, setConsulta] = useState('');
  const { data: todos } = useIndicePrincipiosActivos();

  const texto = consulta.trim();
  // Ocho sugerencias: más no entran arriba del teclado, y la novena nunca se
  // llegó a leer.
  const sugerencias = useMemo(
    () => (texto === '' ? [] : buscar(todos ?? [], texto, POR_NOMBRE, { tope: 8 })),
    [todos, texto],
  );

  return (
    <View>
      <View className="relative justify-center">
        <View className="pointer-events-none absolute left-3.5 z-10">
          <Icono nombre="buscar" tamano={18} color={col.inkSuave} />
        </View>
        <TextInput
          value={consulta}
          onChangeText={setConsulta}
          placeholder={unico ? 'Buscar fármaco' : 'Buscar principio activo…'}
          placeholderTextColor={col.inkSuave}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={unico ? 'Fármaco' : 'Buscar fármaco'}
          className="h-[49px] rounded-lg border border-line pl-10 pr-4 text-body text-ink"
          style={{ backgroundColor: col.paper }}
        />
      </View>

      {sugerencias.length > 0 ? (
        <View className="mb-4 mt-2 overflow-hidden rounded-card border border-line bg-surface">
          {sugerencias.map((pa) => (
            <Pressable
              key={pa.id}
              onPress={() => {
                onAgregar(pa);
                setConsulta('');
              }}
              accessibilityRole="button"
              className="border-b border-line px-3.5 py-2.5"
            >
              <Text className="font-sans text-body text-ink">{pa.nombre}</Text>
              {pa.grupoTerapeutico ? (
                <Text className="font-sans text-meta text-ink-suave">{pa.grupoTerapeutico}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {texto !== '' && sugerencias.length === 0 ? (
        <Text className="font-sans mb-4 mt-2 px-1 text-meta text-ink-suave">
          Sin resultados para «{consulta}». La grafía del catálogo importa: probá con el nombre del
          principio activo.
        </Text>
      ) : null}

      {seleccionados.length > 0 ? (
        <>
          <View className="mb-4 mt-3 flex-row flex-wrap gap-2">
            {seleccionados.map((pa) => (
              <Pressable
                key={pa.id}
                onPress={() => onQuitar(pa.id)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${pa.nombre}`}
                className="flex-row items-center gap-2 rounded-full border px-3 py-1.5"
                style={{ backgroundColor: col.line, borderColor: col.tenue }}
              >
                <Text className="text-meta font-medio text-ink">{pa.nombre}</Text>
                <Icono nombre="cerrar" tamano={13} color={col.inkSuave} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}
