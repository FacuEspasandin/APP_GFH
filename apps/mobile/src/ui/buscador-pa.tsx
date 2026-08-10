import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { Icono } from './iconos';
import { CampoTexto, Eyebrow } from './kit';

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
  const [consulta, setConsulta] = useState('');

  const { data } = useQuery({
    queryKey: ['pa', consulta],
    queryFn: () => api.get<PaSugerido[]>(`/catalogo/principios-activos?q=${encodeURIComponent(consulta)}`),
    enabled: consulta.trim().length >= 2,
  });

  return (
    <View>
      <CampoTexto
        etiqueta={unico ? 'Fármaco' : 'Buscar fármaco'}
        value={consulta}
        onChangeText={setConsulta}
        placeholder="Escribí al menos 2 letras"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {consulta.trim().length >= 2 && (data?.length ?? 0) > 0 ? (
        <View className="mb-4 overflow-hidden rounded-card border border-line bg-surface">
          {data?.slice(0, 8).map((pa) => (
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

      {consulta.trim().length >= 2 && (data?.length ?? 0) === 0 ? (
        <Text className="font-sans mb-4 px-1 text-meta text-ink-suave">
          Sin resultados para «{consulta}». La grafía del catálogo importa: probá con el nombre del
          principio activo.
        </Text>
      ) : null}

      {seleccionados.length > 0 ? (
        <>
          <Eyebrow>Seleccionados</Eyebrow>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {seleccionados.map((pa) => (
              <Pressable
                key={pa.id}
                onPress={() => onQuitar(pa.id)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${pa.nombre}`}
                className="flex-row items-center gap-2 rounded-full border border-primary bg-primary-light px-3 py-1.5"
              >
                <Text className="text-meta font-medio text-primary">{pa.nombre}</Text>
                <Icono nombre="cerrar" tamano={13} color="#1F5E4A" />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}
