import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PAYWALL_RESULT, presentarPaywall } from '@/api/revenuecat';
import type { MotivoPaywall } from '@/dominio/plan-gratis';
import { useAviso } from '@/ui/aviso';
import { Icono } from '@/ui/iconos';
import { Boton, BarraAccion } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { EncabezadoModal } from '@/ui/encabezado-app';

/**
 * Qué se le dice según de dónde venga.
 *
 * El precio y lo que incluye son siempre los mismos; lo que cambia es la
 * primera línea. Al que gastó sus diez consultas decirle "creá tu primer
 * paciente" le habla de algo que no estaba haciendo, y se lee como un cartel
 * genérico en vez de como una respuesta.
 */
const ENCABEZADO: Record<MotivoPaywall, { titulo: string; texto: string }> = {
  paciente: {
    titulo: 'Cargá tus pacientes',
    texto:
      'Con la suscripción cargás a los que atendés y cada uno se verifica solo: interacciones, ajuste renal, condiciones, embarazo y lactancia, cada vez que agregás un fármaco.',
  },
  consultas: {
    titulo: 'Usaste tus consultas gratis',
    texto:
      'Las diez consultas de restricción vienen con la cuenta y no se reponen. Con la suscripción dejás de contarlas: entrás a la que quieras, sobre cualquier fármaco.',
  },
  herramienta: {
    titulo: 'Esta herramienta cruza el catálogo',
    texto:
      'Las calculadoras de clearance y Child-Pugh son libres. Cruzar fármacos entre sí, o contra una condición o un riñón concreto, entra en la suscripción.',
  },
  grupo: {
    titulo: 'Separá dónde atendés',
    texto:
      'Los grupos ordenan a tus pacientes por consultorio, CTI o guardia, y muestran cómo viene cada lugar sin abrir uno por uno.',
  },
};

const INCLUYE = [
  'Pacientes ilimitados, con su cockpit completo',
  'Las cinco verificaciones sobre cada tratamiento',
  'Restricciones de cualquier fármaco, sin contar consultas',
  'Grupos para separar consultorio, CTI o guardia',
];

/**
 * Paywall (1.7). Plan único, mensual o anual.
 *
 * El precio, la compra, el estado de carga/error y "Restaurar compras" son
 * el paywall que RevenueCat arma desde su dashboard (`RevenueCatUI.
 * presentPaywallIfNeeded`) — esta pantalla ya no dibuja ninguno de los dos:
 * sólo dice POR QUÉ el médico está acá (según `motivo`) y qué se lleva, y
 * después le entrega el control al SDK. El backend se entera de la compra
 * SOLO por webhook (regla no negociable 6) — por eso, al volver del paywall,
 * lo único que hace esta pantalla es invalidar `plan`/`suscripción` y volver:
 * no asume que ya está activo, deja que la próxima lectura lo confirme.
 *
 * No hay "seguir con el plan gratis" abajo: no es una decisión que se tome
 * acá. El médico llegó desde algo concreto que quería hacer, y el camino de
 * vuelta es cerrar esta pantalla — por eso se abre con `push` y conserva la
 * anterior.
 */
export default function Paywall() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { avisar } = useAviso();
  const { motivo } = useLocalSearchParams<{ motivo?: string }>();
  const [comprando, setComprando] = useState(false);

  const cabecera = ENCABEZADO[(motivo as MotivoPaywall) ?? 'paciente'] ?? ENCABEZADO.paciente;
  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const verPlanes = async () => {
    setComprando(true);
    try {
      const resultado = await presentarPaywall();
      if (resultado === PAYWALL_RESULT.PURCHASED || resultado === PAYWALL_RESULT.RESTORED) {
        // No se pinta "activado" acá: eso lo dice `/perfil/plan` una vez que
        // el webhook de RevenueCat llegue, que puede tardar unos segundos.
        await queryClient.invalidateQueries({ queryKey: ['plan'] });
        await queryClient.invalidateQueries({ queryKey: ['suscripcion'] });
        cerrar();
      } else if (resultado === PAYWALL_RESULT.ERROR) {
        avisar('No se pudo abrir la compra. Probá de nuevo en un momento.', 'error');
      }
      // CANCELLED y NOT_PRESENTED: el médico se queda en esta pantalla, sin aviso.
    } finally {
      setComprando(false);
    }
  };

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoModal variante="marca" onCerrar={cerrar} />
      <ScrollView contentContainerClassName="px-margen pb-4 pt-5">
        <Text className="text-center text-titular leading-9 font-extra text-ink">
          {cabecera.titulo}
        </Text>
        <Text className="font-sans mt-2 text-center text-body leading-6 text-ink-suave">
          {cabecera.texto}
        </Text>

        {/* Qué se lleva, en concreto. Un paywall que sólo muestra precios
            obliga al médico a recordar por qué llegó hasta acá. */}
        <Superficie elevacion="media" className="mb-4 mt-5 p-5">
          <Text className="mb-3 text-fila font-fuerte text-ink">Qué incluye</Text>
          {INCLUYE.map((linea) => (
            <Incluye key={linea} texto={linea} />
          ))}
        </Superficie>

        <Text className="font-sans mb-2 px-1 text-eyebrow leading-4 text-ink-suave">
          El precio, mensual o anual, se muestra en el paso siguiente. Podés cancelar cuando
          quieras desde la tienda; el acceso sigue hasta el final del período pago.
        </Text>
      </ScrollView>

      <BarraAccion>
        <Boton onPress={verPlanes} cargando={comprando}>
          Ver planes y suscribirme
        </Boton>

        <Pressable
          onPress={cerrar}
          accessibilityRole="button"
          className="mt-1 items-center py-2.5"
        >
          <Text className="font-medio text-meta text-ink-suave">Ahora no</Text>
        </Pressable>
      </BarraAccion>
    </View>
  );
}

function Incluye({ texto }: { texto: string }) {
  const col = useColores();
  return (
    <View className="mb-3 flex-row items-start gap-3">
      <Icono nombre="check" tamano={18} color={col.exito} />
      <Text className="font-sans flex-1 text-body leading-6 text-ink">{texto}</Text>
    </View>
  );
}
