import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { api, ErrorApi } from '@/api/cliente';
import { useValorDemorado } from '@/ui/demora';
import { ErrorGenerico, SinConexion, Skeleton } from '@/ui/estados-sistema';
import { Boton, CampoTexto, Card, Chip, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { useColores } from '@/ui/tema';

interface ProductoResumen {
  id: string;
  nombreComercial: string;
  laboratorio: string | null;
  formaFarmaceutica: string | null;
  dosisTexto: string | null;
  esGenerico: boolean;
  principiosActivos: string[];
  tieneAjusteRenal: boolean;
  tieneAjusteHepatico: boolean;
}

const POR_PAGINA = 40;

/**
 * Buscador a nivel de PRODUCTO COMERCIAL (regla no negociable 10).
 *
 * El catálogo tiene 638 productos y se recorre con `FlashList`, que recicla las
 * filas en vez de mantenerlas todas montadas. Con un `ScrollView` la lista se
 * traba a las pocas páginas, y un buscador que se traba se deja de usar.
 *
 * Por eso la lista es el contenedor de scroll, y nada la envuelve en otro
 * scroll: anidar una lista virtualizada dentro de un `ScrollView` desactiva la
 * virtualización, que es justamente lo que se busca acá.
 *
 * El campo de búsqueda y los atajos viven FUERA de la lista y nunca se
 * desmontan. Antes estaban dentro del bloque que se reemplaza al cargar, así
 * que la primera letra que disparaba una consulta se llevaba puesta la
 * pantalla entera —campo, teclado y foco— y volvía como una pantalla de carga.
 * Escribir no puede sacarte de donde estás escribiendo.
 */
export default function Buscador() {
  const col = useColores();

  const router = useRouter();
  const [consulta, setConsulta] = useState('');
  // Se busca por el valor demorado, pero el campo muestra el inmediato: el
  // texto tiene que aparecer al ritmo del tipeo aunque la consulta espere.
  const consultaBuscada = useValorDemorado(consulta.trim());
  const buscando = consultaBuscada.length >= 2;

  const busqueda = useQuery({
    queryKey: ['catalogo-buscar', consultaBuscada],
    queryFn: () => api.get<ProductoResumen[]>(`/catalogo/productos?q=${encodeURIComponent(consultaBuscada)}`),
    enabled: buscando,
    // Los resultados anteriores quedan a la vista mientras llegan los nuevos.
    // Vaciar la lista en cada tecla hace parpadear la pantalla y da la
    // sensación de que la búsqueda se reinicia sola.
    placeholderData: (anteriores) => anteriores,
  });

  const catalogo = useInfiniteQuery({
    queryKey: ['catalogo-todo'],
    queryFn: ({ pageParam }) => api.get<ProductoResumen[]>(`/catalogo/productos?desde=${pageParam}`),
    initialPageParam: 0,
    // Si la página vino incompleta, no hay más.
    getNextPageParam: (ultima, todas) =>
      ultima.length < POR_PAGINA ? undefined : todas.length * POR_PAGINA,
    enabled: !buscando,
  });

  const lista = buscando ? (busqueda.data ?? []) : (catalogo.data?.pages.flat() ?? []);
  const error = buscando ? busqueda.error : catalogo.error;
  const reintentar = () => void (buscando ? busqueda.refetch() : catalogo.refetch());

  // Sólo cuando no hay NADA que mostrar. Con resultados viejos en pantalla la
  // espera se indica con el punto al lado del rótulo, sin taparlos.
  const vacioYCargando =
    lista.length === 0 && (buscando ? busqueda.isFetching : catalogo.isLoading);
  // El campo ya tiene texto pero la consulta todavía no salió: sin esto,
  // durante esos 250 ms se lee "Sin resultados" para algo que ni se preguntó.
  const esperandoDemora = consulta.trim().length >= 2 && consultaBuscada !== consulta.trim();

  return (
    <Pantalla scroll={false}>
      {/* Fijos: sobreviven a cualquier estado de carga o error de la lista. */}
      <CampoTexto
        value={consulta}
        onChangeText={setConsulta}
        placeholder="Buscar por marca o principio activo"
        autoCapitalize="none"
        autoCorrect={false}
        etiqueta="Buscar"
      />

      <View className="mb-4 flex-row flex-wrap gap-2">
        <Chip texto="Interacciones" onPress={() => router.push('/herramientas/interacciones')} />
        <Chip texto="Ajuste renal" onPress={() => router.push('/herramientas/renal')} />
        <Chip texto="Condición / alergia" onPress={() => router.push('/herramientas/condicion-alergia')} />
      </View>

      <View className="flex-row items-center">
        <Eyebrow>{buscando ? 'Resultados' : 'Catálogo'}</Eyebrow>
        {busqueda.isFetching || esperandoDemora ? (
          <ActivityIndicator size="small" color={col.tenue} className="mb-1.5 ml-2" />
        ) : null}
      </View>

      {error ? (
        error instanceof ErrorApi && error.esSinConexion ? (
          <SinConexion onReintentar={reintentar} />
        ) : (
          <ErrorGenerico
            onReintentar={reintentar}
            detalle={error instanceof Error ? error.message : undefined}
          />
        )
      ) : vacioYCargando || esperandoDemora ? (
        <Skeleton filas={5} />
      ) : (
        <FlashList
          data={lista}
          keyExtractor={(p) => p.id}
          // Tocar un resultado no cierra el teclado antes de registrar el
          // toque: sin esto el primer tap sólo baja el teclado y hay que
          // volver a tocar.
          keyboardShouldPersistTaps="handled"
          // Se pagina sola al llegar al final, sin interrumpir la lectura para
          // pedir lo que ya se estaba pidiendo. En web no dispara — ver el pie.
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!buscando && catalogo.hasNextPage && !catalogo.isFetchingNextPage) {
              void catalogo.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            buscando ? (
              <Estado
                titulo="Sin resultados"
                detalle={`Ningún producto coincide con «${consultaBuscada}».`}
              />
            ) : null
          }
          ListFooterComponent={
            catalogo.isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator color={col.primary} />
              </View>
            ) : !buscando && catalogo.hasNextPage ? (
              // El botón queda aunque `onEndReached` esté puesto: en web no
              // llega a dispararse, y sin él las 638 filas del catálogo se
              // vuelven inalcanzables después de la primera página. Cuando el
              // scroll infinito sí funciona, esto casi nunca se ve.
              <View className="mb-4 mt-2">
                <Boton
                  variante="secundario"
                  onPress={() => void catalogo.fetchNextPage()}
                >
                  Cargar más
                </Boton>
              </View>
            ) : null
          }
          renderItem={({ item: p }) => (
            <Pressable
              onPress={() => router.push(`/farmaco/${p.id}`)}
              accessibilityRole="button"
              className="mb-2"
            >
              <Card className="px-3.5 py-3">
                <Text className="text-body font-medio text-ink">
                  {p.nombreComercial}
                  {p.dosisTexto ? <Text className="font-sans text-ink-suave"> · {p.dosisTexto}</Text> : null}
                </Text>
                <Text className="font-sans mt-0.5 text-meta text-ink-suave">
                  {p.esGenerico ? 'Genérico' : p.principiosActivos.join(' + ')}
                  {p.laboratorio ? ` · ${p.laboratorio}` : ''}
                </Text>
                {p.tieneAjusteRenal || p.tieneAjusteHepatico ? (
                  <View className="mt-2 flex-row gap-1.5">
                    {/* Celeste: marca una PROPIEDAD del fármaco, nunca gravedad.
                        Es el único uso legítimo de este color en el sistema. */}
                    {p.tieneAjusteRenal ? <ChipPropiedad texto="Ajuste renal" /> : null}
                    {p.tieneAjusteHepatico ? <ChipPropiedad texto="Ajuste hepático" /> : null}
                  </View>
                ) : null}
              </Card>
            </Pressable>
          )}
        />
      )}
    </Pantalla>
  );
}

function ChipPropiedad({ texto }: { texto: string }) {
  return (
    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: '#E0F2FE' }}>
      <Text className="text-eyebrow font-fuerte uppercase tracking-wider" style={{ color: '#075985' }}>
        {texto}
      </Text>
    </View>
  );
}
