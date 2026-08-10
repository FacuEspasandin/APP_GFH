import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { api } from '@/api/cliente';
import { AvisoNeutro, Boton, Cargando, Card, Eyebrow, Pantalla } from '@/ui/kit';
import { COLOR_SEVERIDAD } from '@gfh/shared-types';

interface Estado {
  estado: 'SIN_SUSCRIPCION' | 'ACTIVA' | 'GRACIA' | 'VENCIDA' | 'CANCELADA';
  vigente: boolean;
  productId?: string;
  store?: string;
  periodoActualFin?: string;
}

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
  const { data, isLoading } = useQuery({
    queryKey: ['suscripcion'],
    queryFn: () => api.get<Estado>('/perfil/suscripcion'),
  });

  if (isLoading) return <Cargando />;

  const color = data?.vigente
    ? COLOR_SEVERIDAD.ok
    : data?.estado === 'GRACIA'
      ? COLOR_SEVERIDAD.media
      : COLOR_SEVERIDAD.neutro;

  return (
    <Pantalla>
      <Eyebrow>Estado</Eyebrow>
      <Card className="mb-4 px-3.5 py-3.5" >
        <Text className="text-fila font-fuerte" style={{ color }}>
          {TEXTO[data?.estado ?? 'SIN_SUSCRIPCION']}
        </Text>
        {data?.periodoActualFin ? (
          <Text className="font-sans mt-1 text-meta text-ink-suave">
            {data.vigente ? 'Vigente hasta' : 'Venció el'}{' '}
            {new Date(data.periodoActualFin).toLocaleDateString('es-UY')}
          </Text>
        ) : null}
        {data?.store ? (
          <Text className="font-sans mt-0.5 text-meta text-ink-suave">
            {data.store === 'APP_STORE' ? 'App Store' : 'Google Play'}
          </Text>
        ) : null}
      </Card>

      {!data?.vigente ? <Boton onPress={() => router.push('/paywall')}>Ver planes</Boton> : null}

      <AvisoNeutro>
        El estado lo define la tienda. Cancelar o cambiar de plan se hace desde App Store o Google
        Play; puede tardar unos minutos en reflejarse acá.
      </AvisoNeutro>
    </Pantalla>
  );
}
