import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { presentarCentroDeCliente } from '@/api/revenuecat';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { SkeletonLista } from '@/ui/estados-sistema';
import { PantallaConError } from '@/ui/resultado-consulta';
import { AvisoNeutro, Boton, Eyebrow, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { nombreDeLaTienda, tiendaDeLaCompra } from '@/ui/tienda';

import type { EstadoSuscripcion as Estado } from '@/api/tipos';

const TEXTO: Record<Estado['estado'], string> = {
  SIN_SUSCRIPCION: 'Sin suscripción',
  ACTIVA: 'Activa',
  GRACIA: 'Problema de cobro',
  VENCIDA: 'Vencida',
  CANCELADA: 'Cancelada, vigente hasta el fin del período',
};

/** Facturación (6.6). El estado lo define la tienda; acá sólo se lee. */
export default function Suscripcion() {
  const router = useRouter();
  const col = useColores();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['suscripcion'],
    queryFn: API.estadoSuscripcion,
  });

  if (error) {
    return (
      <PantallaConError
        encabezado={<EncabezadoConTitulo titulo="Suscripción" />}
        error={error}
        onReintentar={() => void refetch()}
      />
    );
  }
  if (isLoading) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoConTitulo titulo="Suscripción" />
        <SkeletonLista filas={2} />
      </View>
    );
  }

  // El estado de una suscripción no es gravedad clínica: un punto con los
  // colores de la interfaz, no franja ni texto con la escala de severidad.
  const color = data?.vigente ? col.exito : data?.estado === 'GRACIA' ? col.aviso : col.tenue;

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Suscripción" />
      <Pantalla>
        <Eyebrow>Estado</Eyebrow>
        <Superficie elevacion="media" className="mb-4 px-3.5 py-3.5">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full" style={{ width: 9, height: 9, backgroundColor: color }} />
            <Text className="text-fila font-fuerte text-ink">
              {TEXTO[data?.estado ?? 'SIN_SUSCRIPCION']}
            </Text>
          </View>
          {data?.periodoActualFin ? (
            <Text className="font-sans mt-1 text-meta text-ink-suave">
              {data.vigente ? 'Vigente hasta' : 'Venció el'}{' '}
              {new Date(data.periodoActualFin).toLocaleDateString('es-UY')}
            </Text>
          ) : null}
          {data?.store ? (
            <Text className="font-sans mt-0.5 text-meta text-ink-suave">
              {tiendaDeLaCompra(data.store)}
            </Text>
          ) : null}
        </Superficie>

        {!data?.vigente ? (
          <Boton onPress={() => router.push('/paywall')}>Ver planes</Boton>
        ) : (
          // Cancelar, cambiar de plan o pedir reembolso (iOS) — el Centro de
          // Cliente de RevenueCat lo resuelve sin salir de la app. Sólo tiene
          // sentido con una suscripción vigente: sin eso no hay nada que
          // gestionar más que "Ver planes", que ya está arriba.
          <Boton variante="secundario" onPress={() => void presentarCentroDeCliente()}>
            Gestionar suscripción
          </Boton>
        )}

        <AvisoNeutro>
          El estado lo define la tienda. Cancelar o cambiar de plan se hace desde {nombreDeLaTienda()};
          puede tardar unos minutos en reflejarse acá.
        </AvisoNeutro>
      </Pantalla>
    </View>
  );
}
