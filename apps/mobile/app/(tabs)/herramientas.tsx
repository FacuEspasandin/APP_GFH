import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { usePlan } from '@/api/plan';
import {
  esDePago,
  HERRAMIENTAS,
  rutaHerramienta,
  type Herramienta,
} from '@/dominio/plan-gratis';
import { Icono } from '@/ui/iconos';
import { AvisoNeutro, Eyebrow, FilaAccion, Pantalla } from '@/ui/kit';
import { useColores } from '@/ui/tema';

/**
 * Menú de las herramientas standalone (funcional §6.3).
 *
 * Usan los mismos motores que el cockpit pero sin paciente, y **no guardan
 * nada**: se pierden al salir de la pantalla.
 *
 * Están partidas por lo único que decide el precio: calcular es libre, cruzar
 * no. Las pagas se muestran igual, con candado — esconderlas escondería el
 * producto, y nadie puede querer lo que no sabe que existe.
 */
export default function Herramientas() {
  const router = useRouter();
  const { data: plan } = usePlan();
  const conCandado = esDePago(plan);

  const libres = HERRAMIENTAS.filter((h) => !h.cruza);
  const cruzan = HERRAMIENTAS.filter((h) => h.cruza);

  const abrir = (h: Herramienta) => router.push(rutaHerramienta(h, plan) as never);

  return (
    <Pantalla>
      <Eyebrow>Calculadoras</Eyebrow>
      {libres.map((h) => (
        <FilaAccion key={h.clave} titulo={h.titulo} detalle={h.detalle} onPress={() => abrir(h)} />
      ))}

      <View className="mt-4">
        <Eyebrow>Contra el catálogo</Eyebrow>
      </View>
      {cruzan.map((h) =>
        conCandado ? (
          <FilaConCandado key={h.clave} h={h} onPress={() => abrir(h)} />
        ) : (
          <FilaAccion key={h.clave} titulo={h.titulo} detalle={h.detalle} onPress={() => abrir(h)} />
        ),
      )}

      <View className="mt-4">
        <AvisoNeutro>
          {conCandado
            ? 'Las calculadoras son de uso libre. Cruzar fármacos contra el catálogo entra en la suscripción.'
            : 'No se guarda nada. Al salir se pierde.'}
        </AvisoNeutro>
      </View>
    </Pantalla>
  );
}

/**
 * Igual que `FilaAccion` pero con candado en lugar de chevron.
 *
 * El candado va del lado del chevron a propósito: es lo que pasa al tocar, y
 * ese es el lugar donde el ojo busca qué va a pasar. Un candado adelante del
 * título se leería como una categoría.
 */
function FilaConCandado({ h, onPress }: { h: Herramienta; onPress: () => void }) {
  const col = useColores();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${h.titulo}. Incluido en la suscripción`}
      className="mb-2.5 flex-row items-center rounded-card border border-line bg-surface px-3.5 py-3.5"
    >
      <View className="flex-1">
        <Text className="text-fila font-medio text-ink">{h.titulo}</Text>
        <Text className="font-sans mt-0.5 text-meta text-ink-suave">{h.detalle}</Text>
      </View>

      <View
        className="ml-2.5 h-7 w-7 items-center justify-center rounded-full"
        style={{ backgroundColor: col.primaryLight }}
      >
        <Icono nombre="candado" tamano={14} color={col.primary} />
      </View>
    </Pressable>
  );
}
