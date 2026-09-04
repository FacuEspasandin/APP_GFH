import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useIndiceProductos, type ProductoResumen } from '@/api/catalogo';
import { plano } from '@/dominio/busqueda';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { ErrorGenerico, SinConexion, Skeleton } from '@/ui/estados-sistema';
import { ErrorApi } from '@/api/cliente';
import { Estado } from '@/ui/kit';
import { MarcadoresAjuste } from '@/ui/marcadores-ajuste';
import { Superficie } from '@/ui/superficie';

/**
 * Paso 2 de aceptar una alternativa (motor §8, rediseño): elegir CON QUÉ
 * medicamento comercial se prescribe el fármaco elegido en el paso 1.
 *
 * Antes el backend resolvía el genérico en silencio; ahora el médico ve las
 * presentaciones reales del catálogo y elige — el genérico sigue siendo una
 * opción más de la lista, no un default invisible. Coincide con la regla no
 * negociable 8: lo que se termina prescribiendo es siempre un producto
 * comercial.
 */
export default function ElegirProductoAlternativa() {
  const router = useRouter();
  const { id: pacienteId, paOrigenId, paAlternativaId, prescripcion, origen, alternativa } =
    useLocalSearchParams<{
      id: string;
      paOrigenId: string;
      paAlternativaId: string;
      prescripcion?: string;
      origen?: string;
      alternativa?: string;
    }>();

  const catalogo = useIndiceProductos();
  const nombreBuscado = plano(alternativa ?? '');

  const productos = useMemo(() => {
    if (!catalogo.data) return [];
    return catalogo.data
      .filter((p) => p.principiosActivos.some((n) => plano(n) === nombreBuscado))
      // El genérico primero: sin marca elegida todavía, es la opción neutra.
      .sort((a, b) => Number(b.esGenerico) - Number(a.esGenerico));
  }, [catalogo.data, nombreBuscado]);

  function elegir(producto: ProductoResumen) {
    router.push({
      pathname: '/paciente/[id]/aceptar-alternativa',
      params: {
        id: pacienteId,
        paOrigenId,
        paAlternativaId,
        ...(prescripcion ? { prescripcion } : {}),
        origen: origen ?? '',
        alternativa: alternativa ?? '',
        productoComercialId: producto.id,
      },
    } as never);
  }

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Selección de medicamento" cierra />

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
        <Skeleton filas={4} />
      ) : (
        <ScrollView contentContainerClassName="px-4 pb-4 pt-3.5">
          <View className="mb-4 flex-row items-center gap-2 rounded-chip bg-primary-light px-3.5 py-2.5">
            <Icono nombre="check" tamano={16} color="#1F5E4A" />
            <Text className="font-fuerte text-body text-primary">{alternativa}</Text>
          </View>

          {productos.length === 0 ? (
            <Estado
              titulo="Sin presentación cargada"
              detalle={`El catálogo no tiene ningún medicamento comercial con ${alternativa} todavía. Cargalo a mano desde Agregar fármaco.`}
            />
          ) : (
            productos.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => elegir(p)}
                accessibilityRole="button"
                className="mb-2"
              >
                <Superficie elevacion="plana" className="flex-row items-center px-3.5 py-3">
                  <View className="flex-1 pr-2">
                    <Text className="text-fila font-medio text-ink" numberOfLines={2}>
                      {p.nombreComercial}
                      {p.dosisTexto ? (
                        <Text className="font-sans text-ink-suave"> · {p.dosisTexto}</Text>
                      ) : null}
                    </Text>
                    <Text className="font-sans mt-0.5 text-meta text-ink-suave" numberOfLines={1}>
                      {p.esGenerico ? 'Genérico' : (p.laboratorio ?? 'Sin laboratorio')}
                    </Text>
                  </View>
                  <MarcadoresAjuste renal={p.tieneAjusteRenal} hepatico={p.tieneAjusteHepatico} />
                  <Icono nombre="chevron" tamano={15} color="#8CA39A" />
                </Superficie>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
