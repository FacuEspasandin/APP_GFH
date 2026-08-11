import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { api, ErrorApi } from '@/api/cliente';
import { useValorDemorado } from '@/ui/demora';
import { ErrorGenerico, SinConexion, Skeleton } from '@/ui/estados-sistema';
import { Boton, CampoTexto, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { MarcadoresAjuste } from '@/ui/marcadores-ajuste';
import { Superficie } from '@/ui/superficie';
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

/** Lo que corta el backend al buscar (`CatalogoService.buscarProductos`). */
const TOPE_BUSQUEDA = 30;

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

  // Cuántos productos hay en total. Va en su propia consulta porque no cambia
  // entre páginas: pedirlo con cada página sería contar la tabla entera cada
  // vez que alguien baja el scroll.
  const conteo = useQuery({
    queryKey: ['catalogo-conteo'],
    queryFn: () => api.get<{ productos: number }>('/catalogo/productos/conteo'),
    staleTime: 60 * 60_000,
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

  /**
   * El tamaño de lo que se está mirando.
   *
   * Buscando dice cuántos coincidieron; el backend corta en 30, y cuando el
   * corte se alcanza hay que decirlo — "30 resultados" a secas haría creer que
   * no hay más y que la búsqueda no vale la pena afinarla.
   */
  function conteoTexto(): string {
    if (buscando) {
      if (lista.length === 0) return '';
      return lista.length >= TOPE_BUSQUEDA ? `primeros ${TOPE_BUSQUEDA}` : `${lista.length}`;
    }
    return conteo.data ? `${conteo.data.productos} productos` : '';
  }

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

      {/* Los tres atajos a herramientas salieron de acá: desde que existe el
          botón central del menú son el segundo camino a lo mismo, y ocupaban
          una franja fija arriba de la lista en la pantalla donde el espacio
          vertical es todo. */}

      <View className="mb-1 flex-row items-center">
        <Eyebrow>{buscando ? 'Resultados' : 'Catálogo'}</Eyebrow>
        <Text className="font-mono mb-1.5 ml-2 text-eyebrow text-tenue">{conteoTexto()}</Text>
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
          renderItem={({ item: p, index }) => (
            <>
              {/* La letra sólo al recorrer el catálogo completo: en una lista
                  de resultados no hay nada que indexar, y sobre 638 productos
                  alfabéticos saber en qué letra vas es lo único que orienta. */}
              {!buscando && inicial(p) !== inicial(lista[index - 1]) ? (
                <Text className="font-mono px-1 pb-1 pt-3 text-eyebrow tracking-wider text-tenue">
                  {inicial(p)}
                </Text>
              ) : null}
              <FilaProducto producto={p} onPress={() => router.push(`/farmaco/${p.id}`)} />
            </>
          )}
        />
      )}
    </Pantalla>
  );
}

/** La letra por la que ordena el backend. `undefined` para el ítem anterior
 *  del primero, que por eso siempre imprime su letra. */
function inicial(p?: ProductoResumen): string {
  return p ? p.nombreComercial.charAt(0).toUpperCase() : '';
}

/**
 * Una fila del catálogo, de alto fijo.
 *
 * La marca en negro y la dosis en gris en el mismo renglón: se busca por
 * marca, no por miligramos, y separarlas deja que el ojo salte de nombre en
 * nombre. Los marcadores de ajuste van a la derecha en dos lugares que existen
 * siempre — ver `MarcadoresAjuste`.
 */
function FilaProducto({
  producto: p,
  onPress,
}: {
  producto: ProductoResumen;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${p.nombreComercial}${p.dosisTexto ? `, ${p.dosisTexto}` : ''}`}
      className="mb-2"
    >
      <Superficie elevacion="plana" className="flex-row items-center px-3.5 py-2.5">
        <View className="flex-1 pr-2">
          <Text className="text-fila font-medio text-ink" numberOfLines={1}>
            {p.nombreComercial}
            {p.dosisTexto ? (
              <Text className="font-sans text-ink-suave"> · {p.dosisTexto}</Text>
            ) : null}
          </Text>
          <Text className="font-sans mt-0.5 text-meta text-ink-suave" numberOfLines={1}>
            {p.esGenerico ? 'Genérico' : p.principiosActivos.join(' + ')}
            {p.laboratorio ? ` · ${p.laboratorio}` : ''}
          </Text>
        </View>
        <MarcadoresAjuste renal={p.tieneAjusteRenal} hepatico={p.tieneAjusteHepatico} />
      </Superficie>
    </Pressable>
  );
}
