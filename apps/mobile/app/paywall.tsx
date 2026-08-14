import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { MotivoPaywall } from '@/dominio/plan-gratis';
import { Icono } from '@/ui/iconos';
import { Boton } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

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
      <ScrollView contentContainerClassName="px-4 pb-4 pt-3">
        <Text className="text-grande font-fuerte text-ink">{cabecera.titulo}</Text>
        <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">
          {cabecera.texto}
        </Text>

        {/* Qué se lleva, en concreto. Un paywall que sólo muestra precios
            obliga al médico a recordar por qué llegó hasta acá. */}
        <Superficie elevacion="plana" className="mb-4 mt-3.5">
          {INCLUYE.map((linea, i) => (
            <Incluye key={linea} texto={linea} primera={i === 0} />
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

function Incluye({ texto, primera }: { texto: string; primera: boolean }) {
  const col = useColores();

  return (
    <View className={`flex-row items-center px-3.5 py-3 ${primera ? '' : 'border-t border-line'}`}>
      <View
        className="mr-3 items-center justify-center rounded"
        style={{ width: 26, height: 26, backgroundColor: col.primaryLight }}
      >
        <Icono nombre="check" tamano={15} color={col.primary} />
      </View>
      <Text className="font-sans flex-1 text-meta leading-5 text-ink">{texto}</Text>
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

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: activo }}
      className="mb-2.5 flex-row items-center rounded-card bg-surface px-3.5 py-3.5"
      style={{ borderColor: activo ? col.primary : col.line, borderWidth: activo ? 2 : 1 }}
    >
      <View className="flex-1">
        <Text className="text-fila font-fuerte text-ink">{p.titulo}</Text>
        <Text className="font-sans mt-0.5 text-meta text-ink-suave">{p.detalle}</Text>
      </View>
      <Text
        className="font-mono-fuerte text-fila"
        style={{ color: activo ? col.primary : col.inkSuave, fontVariant: ['tabular-nums'] }}
      >
        {p.precio}
      </Text>
    </Pressable>
  );
}
