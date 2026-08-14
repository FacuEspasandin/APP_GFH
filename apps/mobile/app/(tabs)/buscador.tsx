import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ErrorApi } from '@/api/cliente';
import { POR_PRODUCTO, useIndiceProductos, type ProductoResumen } from '@/api/catalogo';
import { buscar, contar } from '@/dominio/busqueda';
import { cambiaDeLetra, inicialDe, textoConteo, TOPE_BUSQUEDA } from '@/dominio/catalogo';
import { ErrorGenerico, SinConexion, Skeleton } from '@/ui/estados-sistema';
import { CampoTexto, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { MarcadoresAjuste } from '@/ui/marcadores-ajuste';
import { Superficie } from '@/ui/superficie';

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
 *
 * **La búsqueda ya no viaja.** El catálogo entero —638 productos, 163 KB— se
 * baja una vez y se filtra acá. Antes cada tecla era una petición de ~390 ms
 * contra São Paulo y había que esperar dos letras y una pausa de tipeo para
 * disparar; ahora los resultados salen desde la primera letra, al ritmo del
 * dedo, y sin señal. Se fueron con eso la demora, la paginación de a 40 y el
 * botón de «cargar más».
 */
export default function Buscador() {

  const router = useRouter();
  // Arranca con lo que venga en la ruta: el vacío de Herramientas —«ninguna
  // herramienta se llama warfarina»— manda para acá con el término puesto, y
  // hacérselo escribir de nuevo desperdiciaría el único momento en que ya
  // sabemos qué estaba buscando.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [consulta, setConsulta] = useState(q ?? '');

  const catalogo = useIndiceProductos();
  const todos = useMemo(() => catalogo.data ?? [], [catalogo.data]);

  const texto = consulta.trim();
  const buscando = texto.length >= 1;

  // `useMemo` y no cálculo suelto: recorrer 638 productos por tecla no se nota,
  // pero `FlashList` remonta las filas si el array cambia de identidad, y eso
  // sí se nota.
  const lista = useMemo(
    () => buscar(todos, texto, POR_PRODUCTO, { tope: TOPE_BUSQUEDA }),
    [todos, texto],
  );
  const coincidencias = useMemo(() => contar(todos, texto, POR_PRODUCTO), [todos, texto]);


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
        <Text className="font-mono mb-1.5 ml-2 text-eyebrow text-tenue">
          {textoConteo(buscando, coincidencias, todos.length)}
        </Text>
      </View>

      {catalogo.error ? (
        catalogo.error instanceof ErrorApi && catalogo.error.esSinConexion ? (
          <SinConexion onReintentar={() => void catalogo.refetch()} />
        ) : (
          <ErrorGenerico
            onReintentar={() => void catalogo.refetch()}
            detalle={catalogo.error instanceof Error ? catalogo.error.message : undefined}
          />
        )
      ) : catalogo.isLoading ? (
        <Skeleton filas={5} />
      ) : (
        <FlashList
          data={lista}
          keyExtractor={(p) => p.id}
          // Tocar un resultado no cierra el teclado antes de registrar el
          // toque: sin esto el primer tap sólo baja el teclado y hay que
          // volver a tocar.
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            buscando ? (
              <Estado
                titulo="Sin resultados"
                detalle={`Ningún producto coincide con «${texto}».`}
              />
            ) : null
          }
          renderItem={({ item: p, index }) => (
            <>
              {/* La letra sólo al recorrer el catálogo completo: en una lista
                  de resultados no hay nada que indexar, y sobre 638 productos
                  alfabéticos saber en qué letra vas es lo único que orienta. */}
              {!buscando && cambiaDeLetra(p.nombreComercial, lista[index - 1]?.nombreComercial) ? (
                <Text className="font-mono px-1 pb-1 pt-3 text-eyebrow tracking-wider text-tenue">
                  {inicialDe(p.nombreComercial)}
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
