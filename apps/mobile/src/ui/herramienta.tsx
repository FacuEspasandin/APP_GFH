import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Boton } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { claveColorPorRango, COLOR_SEVERIDAD, type RangoGravedad } from '@gfh/shared-types';

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
 */
export function ConsultaPlegada({
  titulo,
  detalle,
  onCambiar,
}: {
  titulo: string;
  detalle: string;
  onCambiar: () => void;
}) {
  const col = useColores();

  return (
    <View className="flex-row items-center border-b border-line bg-surface px-4 py-2.5">
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
const FONDO_POR_CLAVE: Record<string, string> = {
  grave: '#FEF2F2',
  media: '#FFFBEB',
  ok: '#F0FDF4',
  neutro: 'transparent',
};

export function Veredicto({
  rango,
  titulo,
  detalle,
  cifra,
}: {
  /** `null` = sin hallazgos. Distinto de 3, que es informativo. */
  rango: RangoGravedad | null;
  titulo: string;
  detalle?: string;
  /** Para el ajuste renal: el Clcr manda sobre el texto. */
  cifra?: string;
}) {
  const col = useColores();
  const clave = claveColorPorRango(rango);
  const color = COLOR_SEVERIDAD[clave];
  const fondo = FONDO_POR_CLAVE[clave] ?? 'transparent';

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
        style={{ width: 8, height: 8, backgroundColor: COLOR_SEVERIDAD[claveColorPorRango(rango)] }}
      />
      <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
        {ETIQUETA[rango]} · {cuantos}
      </Text>
    </View>
  );
}

/** Las etiquetas de la escala del sistema, tal cual. */
const ETIQUETA: Record<RangoGravedad, string> = {
  0: 'Contraindicado',
  1: 'Grave',
  2: 'Atención',
  3: 'Informativo',
};

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
        borderLeftColor: COLOR_SEVERIDAD[claveColorPorRango(rango)],
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
export function AvisoDescartable({ extra }: { extra?: string }) {
  return (
    <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3">
      <Text className="font-sans text-meta leading-5 text-ink-suave">
        {extra ? `${extra} ` : ''}Esta herramienta no guarda nada: al salir se pierde. Para dejarlo
        registrado, cargá el fármaco en un paciente.
      </Text>
    </Superficie>
  );
}
