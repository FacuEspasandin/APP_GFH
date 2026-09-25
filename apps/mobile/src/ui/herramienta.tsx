import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icono } from '@/ui/iconos';
import { Boton } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { colorEspina, RANGO_ETIQUETA, type RangoGravedad } from '@gfh/shared-types';

/**
 * El esqueleto de las tres herramientas: consulta y resultado como DOS estados
 * de la misma pantalla, no como dos mitades del mismo scroll.
 *
 * Antes el resultado se agregaba abajo del formulario. Con el teclado abierto
 * y cuatro fármacos cargados, nacía fuera de la vista y nada avisaba que ya
 * estaba: el médico tocaba "Analizar" y la pantalla no cambiaba.
 */

/** La consulta mientras se arma: bloques y el botón fijo al pie. */
export function Consulta({
  children,
  accion,
  onAccion,
  cargando,
  deshabilitado,
}: {
  children: ReactNode;
  /** Dice lo que va a pasar —"Analizar 6 pares"—, no lo que falta. */
  accion: string;
  onAccion: () => void;
  cargando?: boolean;
  deshabilitado?: boolean;
}) {
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-4 pb-4 pt-3" keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>

      <View className="border-t border-line bg-surface px-4 py-3">
        <Boton onPress={onAccion} cargando={cargando} deshabilitado={deshabilitado}>
          {accion}
        </Boton>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * La consulta ya hecha, plegada arriba del resultado.
 *
 * Dos renglones: qué se preguntó y con qué datos. Lo segundo importa más de lo
 * que parece — al ver un Clcr de 28,2 lo primero que se duda es con qué peso
 * se calculó.
 *
 * Hace de encabezado de la pantalla en el estado de resultado —no hay
 * `EncabezadoApp` arriba—, así que el padding del notch/status bar es suyo:
 * sin `insets.top` el botón "Cambiar" queda debajo de la hora y la cámara.
 *
 * `variante`: 'cambiar' (default) es un botón de texto que rearma la consulta
 * con otros datos — las herramientas standalone. 'volver' es una flecha atrás
 * de verdad: Alternativas ya hacía `router.back()` bajo el rótulo "Cambiar",
 * que no cambia nada y confundía — nadie esperaba que "Cambiar" fuera la
 * única forma de salir de la pantalla.
 */
export function ConsultaPlegada({
  titulo,
  detalle,
  onCambiar,
  variante = 'cambiar',
}: {
  titulo: string;
  detalle: string;
  onCambiar: () => void;
  variante?: 'cambiar' | 'volver';
}) {
  const col = useColores();
  const insets = useSafeAreaInsets();

  if (variante === 'volver') {
    return (
      <View
        className="flex-row items-center border-b border-line bg-surface px-2 pb-2.5"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Pressable
          onPress={onCambiar}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Icono nombre="atras" tamano={18} color={col.ink} />
        </Pressable>
        <View className="flex-1 pr-3">
          <Text className="text-body font-medio text-ink" numberOfLines={1}>
            {titulo}
          </Text>
          <Text className="font-sans text-meta text-ink-suave" numberOfLines={1}>
            {detalle}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      className="flex-row items-center border-b border-line bg-surface px-4 pb-2.5"
      style={{ paddingTop: insets.top + 10 }}
    >
      <View className="flex-1 pr-3">
        <Text className="text-body font-medio text-ink" numberOfLines={1}>
          {titulo}
        </Text>
        <Text className="font-sans text-meta text-ink-suave" numberOfLines={1}>
          {detalle}
        </Text>
      </View>

      <Pressable
        onPress={onCambiar}
        accessibilityRole="button"
        accessibilityLabel="Cambiar la consulta"
        className="rounded-full border border-line px-3 py-1.5"
      >
        <Text className="font-medio text-meta" style={{ color: col.primary }}>
          Cambiar
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * El titular del resultado.
 *
 * Antes esto era un rótulo de 11px en gris arriba de la lista: "3 de 6 pares
 * con interacción conocida". Lo que el médico vino a saber —si hay algo grave—
 * se leía con la misma jerarquía que un encabezado de sección.
 *
 * El fondo tiñe con la gravedad. Los colores salen de la escala clínica: acá no
 * se elige un tono porque quede bien.
 */
/** Sin `null` acá: sin hallazgos no pasa por este componente en la práctica,
 *  y de pasar, cae en el wash más neutro. */
const FONDO_POR_RANGO: Record<RangoGravedad, string> = {
  0: '#FEF2F2',
  1: '#FEF2F2',
  2: '#FFF7ED',
  3: '#FFFBEB',
  4: '#FFFBEB',
  5: 'transparent',
};

export function Veredicto({
  rango,
  titulo,
  detalle,
  cifra,
}: {
  /** `null` = sin hallazgos. Distinto de 5, que es informativo. */
  rango: RangoGravedad | null;
  titulo: string;
  detalle?: string;
  /** Para el ajuste renal: el Clcr manda sobre el texto. */
  cifra?: string;
}) {
  const col = useColores();
  const color = colorEspina(rango);
  const fondo = rango === null ? '#F0FDF4' : FONDO_POR_RANGO[rango];

  return (
    <Superficie
      elevacion="plana"
      className="mb-3.5 px-3.5 py-3.5"
      style={{ backgroundColor: fondo === 'transparent' ? col.surface : fondo }}
    >
      <View className="flex-row items-center">
        {cifra ? (
          <Text
            className="font-mono-fuerte mr-3"
            style={{ color, fontSize: 26, fontVariant: ['tabular-nums'] }}
          >
            {cifra}
          </Text>
        ) : (
          <View
            className="mr-2.5 rounded-full"
            style={{ width: 10, height: 10, backgroundColor: color }}
          />
        )}
        <Text className="flex-1 text-fila font-fuerte text-ink">{titulo}</Text>
      </View>

      {detalle ? (
        <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">{detalle}</Text>
      ) : null}
    </Superficie>
  );
}

/** Encabezado de un grupo de resultados de la misma gravedad. */
export function GrupoGravedad({ rango, cuantos }: { rango: RangoGravedad; cuantos: number }) {
  return (
    <View className="mb-1.5 mt-1 flex-row items-center">
      <View
        className="mr-2 rounded-full"
        style={{ width: 8, height: 8, backgroundColor: colorEspina(rango) }}
      />
      <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
        {RANGO_ETIQUETA[rango]} · {cuantos}
      </Text>
    </View>
  );
}

/**
 * Una fila de resultado con su espina de gravedad.
 *
 * Dentro de un grupo la severidad ya la dice el encabezado, así que no se
 * repite en cada fila: ese lugar lo ocupa el mecanismo o la recomendación, que
 * es lo que se usa para decidir.
 */
export function FilaResultado({
  titulo,
  detalle,
  rango,
  children,
}: {
  titulo: ReactNode;
  detalle?: string | null;
  rango: RangoGravedad | null;
  children?: ReactNode;
}) {
  return (
    <Superficie
      elevacion="plana"
      className="mb-2 px-3.5 py-3"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: colorEspina(rango),
      }}
    >
      {typeof titulo === 'string' ? (
        <Text className="text-body font-medio text-ink">{titulo}</Text>
      ) : (
        titulo
      )}
      {detalle ? (
        <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">{detalle}</Text>
      ) : null}
      {children}
    </Superficie>
  );
}

/**
 * El recordatorio de que estas pantallas no guardan nada.
 *
 * Va en la consulta y no sólo al final del resultado: enterarse después de
 * cargar diez fármacos es enterarse tarde. Que sean descartables es una
 * decisión de producto, no una limitación técnica.
 */
export function AvisoDescartable({ extra, acercaDe }: { extra?: string; acercaDe: string }) {
  return (
    <>
      <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3">
        <Text className="font-sans text-meta leading-5 text-ink-suave">
          {extra ? `${extra} ` : ''}Esta herramienta no guarda nada: al salir se pierde. Para dejarlo
          registrado, cargá el fármaco en un paciente.
        </Text>
      </Superficie>

      {/* Mismo bloque que el molde genérico, al pie de todo — ver
          `calculadora.tsx`. Estas cuatro no usan `Calculadora`/`Molde`
          (cruzan el catálogo, no son un cálculo puro), así que el texto se
          pasa acá en vez de vivir en un campo del molde. */}
      <View
        className="mb-3.5 rounded-card border border-line bg-surface px-4 py-3.5"
        style={{ borderLeftWidth: 3, borderLeftColor: '#8CA39A' }}
      >
        <Text className="font-sans mb-1.5 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
          ⓘ Sobre esta herramienta
        </Text>
        <Text className="font-sans text-meta leading-5 text-ink-suave">{acercaDe}</Text>
      </View>
    </>
  );
}
