import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MotivoPaywall } from '@/dominio/plan-gratis';
import { Icono } from '@/ui/iconos';
import { Boton } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/** Cierra este flujo lineal: "GFH" chico centrado + una X, sin volver — sale
 *  por acá o por "Ahora no" del pie, nunca por un back que reabra el motivo
 *  que trajo al médico hasta el paywall. */
function EncabezadoPaywall({ onCerrar }: { onCerrar: () => void }) {
  const col = useColores();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-center border-b px-5"
      style={{ paddingTop: insets.top, backgroundColor: col.surface, borderColor: col.line }}
    >
      <View className="h-16 flex-1 items-center justify-center">
        <Text className="text-fila font-fuerte" style={{ color: '#005228' }}>
          GFH
        </Text>
      </View>
      <Pressable
        onPress={onCerrar}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        hitSlop={8}
        className="absolute right-3 h-10 w-10 items-center justify-center rounded-full"
      >
        <Icono nombre="cerrar" tamano={16} color={col.ink} />
      </Pressable>
    </View>
  );
}

type Plan = 'mensual' | 'anual';

const PRECIO: Record<Plan, { titulo: string; precio: string; detalle: string; boton: string }> = {
  anual: {
    titulo: 'Anual',
    precio: 'USD 69,99',
    detalle: 'USD 5,83 por mes · dos meses gratis',
    boton: 'Suscribirme · USD 69,99 al año',
  },
  mensual: {
    titulo: 'Mensual',
    precio: 'USD 6,99',
    detalle: 'Se renueva todos los meses',
    boton: 'Suscribirme · USD 6,99 por mes',
  },
};

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
 * El botón no cobra nada: la compra la hace StoreKit / Play Billing vía
 * RevenueCat, y el backend se entera SOLO por webhook (regla no negociable 6).
 * Hasta que el SDK esté integrado, la pantalla lo dice en vez de fingir.
 *
 * No hay "seguir con el plan gratis" abajo: no es una decisión que se tome acá.
 * El médico llegó desde algo concreto que quería hacer, y el camino de vuelta
 * es cerrar esta pantalla — por eso se abre con `push` y conserva la anterior.
 */
export default function Paywall() {
  const router = useRouter();
  const { motivo } = useLocalSearchParams<{ motivo?: string }>();
  const [plan, setPlan] = useState<Plan>('anual');
  const [avisoCobro, setAvisoCobro] = useState(false);

  const cabecera = ENCABEZADO[(motivo as MotivoPaywall) ?? 'paciente'] ?? ENCABEZADO.paciente;

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoPaywall onCerrar={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <ScrollView contentContainerClassName="px-4 pb-4 pt-5">
        <Text className="text-center text-[28px] leading-9 font-fuerte text-ink">
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

        {(['anual', 'mensual'] as const).map((p) => (
          <OpcionPlan key={p} plan={p} activo={plan === p} onPress={() => setPlan(p)} />
        ))}

        <Superficie elevacion="plana" className="mb-3 mt-1 px-3.5 py-3">
          <Text className="font-sans text-meta leading-5 text-ink-suave">
            El cobro todavía no está conectado. La suscripción se gestiona desde la tienda del
            teléfono y el backend sólo la sincroniza desde ahí.
          </Text>
        </Superficie>

        {avisoCobro ? (
          <Superficie elevacion="plana" className="mb-3 px-3.5 py-3">
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              Todavía no se puede cobrar desde acá: falta integrar RevenueCat. Cuando esté, este
              botón abre la compra de la tienda y el acceso se activa solo.
            </Text>
          </Superficie>
        ) : null}

        <Text className="font-sans mb-2 px-1 text-eyebrow leading-4 text-ink-suave">
          Podés cancelar cuando quieras desde la tienda; el acceso sigue hasta el final del período
          pago.
        </Text>
      </ScrollView>

      <View className="border-t border-line bg-surface px-4 py-3">
        {/* El botón dice qué se cobra y cada cuánto. Mientras no exista el SDK
            explica por qué no pasa nada, en vez de esconder el precio. */}
        <Boton onPress={() => setAvisoCobro(true)}>{PRECIO[plan].boton}</Boton>

        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          className="mt-1 items-center py-2.5"
        >
          <Text className="font-medio text-meta text-ink-suave">Ahora no</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Incluye({ texto }: { texto: string }) {
  return (
    <View className="mb-3 flex-row items-start gap-3">
      <Icono nombre="check" tamano={18} color="#22C55E" />
      <Text className="font-sans flex-1 text-body leading-6 text-ink">{texto}</Text>
    </View>
  );
}

function OpcionPlan({
  plan,
  activo,
  onPress,
}: {
  plan: Plan;
  activo: boolean;
  onPress: () => void;
}) {
  const col = useColores();
  const p = PRECIO[plan];
  const destacado = plan === 'anual';

  return (
    <View className="mb-3">
      {destacado ? (
        <View
          className="absolute -top-3 right-4 z-10 rounded-full px-2.5 py-1"
          style={{ backgroundColor: '#005228' }}
        >
          <Text className="font-fuerte text-[10px] uppercase tracking-wider text-white">
            Mejor valor
          </Text>
        </View>
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected: activo }}
        className="flex-row items-center justify-between rounded-xl px-4 py-4"
        style={{
          backgroundColor: activo && destacado ? '#E6F1EC' : col.surface,
          borderColor: activo ? '#005228' : col.line,
          borderWidth: activo ? 2 : 1,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View
            className="h-5 w-5 items-center justify-center rounded-full border-2"
            style={{ borderColor: activo ? '#005228' : col.tenue }}
          >
            {activo ? <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#005228' }} /> : null}
          </View>
          <View>
            <Text className="text-fila font-fuerte text-ink">{p.titulo}</Text>
            <Text className="font-sans mt-0.5 text-meta text-ink-suave">{p.detalle}</Text>
          </View>
        </View>
        <Text
          className="font-mono-fuerte text-fila"
          style={{ color: activo ? '#005228' : col.inkSuave, fontVariant: ['tabular-nums'] }}
        >
          {p.precio}
        </Text>
      </Pressable>
    </View>
  );
}
