import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { hapticaSeleccion } from './haptica';
import { useColores } from './tema';
import { COLOR_SEVERIDAD, etiquetaRango, evaluarValor, type Rango } from '@gfh/shared-types';

/**
 * Primitivos de UI. Todo el sistema visual sale de acá para que no haya
 * catorce variantes del mismo botón.
 *
 * Los colores clínicos NO están en este archivo: viven en
 * `@gfh/shared-types/severidad` y se aplican por `style`. Acá solo hay tokens
 * de tema.
 */

/**
 * El pie con el descargo salió de acá.
 *
 * Estaba en TODAS las pantallas y comía una franja permanente sin decir nada
 * nuevo después de la primera vez. El descargo médico-legal sigue donde
 * corresponde: la pantalla de aceptación obligatoria al entrar, con su versión
 * registrada por médico.
 */
export function Pantalla({
  children,
  scroll = true,
  onRefrescar,
  refrescando = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  /**
   * Deslizar hacia abajo vuelve a pedir los datos.
   *
   * Sólo donde el dato puede cambiar por fuera de lo que hace el médico en esa
   * pantalla: la lista de pacientes y el cockpit. En un formulario el gesto no
   * tendría nada que refrescar y ofrecerlo sería prometer algo que no pasa.
   */
  onRefrescar?: () => void;
  refrescando?: boolean;
}) {
  const col = useColores();

  const contenido = scroll ? (
    <ScrollView
      contentContainerClassName="px-4 pb-6 pt-3"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefrescar ? (
          <RefreshControl
            refreshing={refrescando}
            onRefresh={onRefrescar}
            // El color del indicador es el de marca y no el de severidad: esto
            // es cromo de la app, no información clínica.
            tintColor={col.primary}
            colors={[col.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 px-4 pb-6 pt-3">{children}</View>
  );

  return (
    <View className="flex-1 bg-paper">
      {contenido}
    </View>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text className="mb-2 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
      {children}
    </Text>
  );
}

/** Fila tocable con chevron implícito. Es el patrón de casi todo el Perfil. */
export function FilaAccion({
  titulo,
  detalle,
  onPress,
  destructiva,
  derecha,
}: {
  titulo: string;
  detalle?: string;
  onPress?: () => void;
  destructiva?: boolean;
  derecha?: ReactNode;
}) {
  const col = useColores();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="mb-2 flex-row items-center rounded-card border border-line bg-surface px-3.5 py-3"
    >
      <View className="flex-1">
        <Text
          className="text-body font-medio"
          style={{ color: destructiva ? col.peligro : col.ink }}
        >
          {titulo}
        </Text>
        {detalle ? <Text className="font-sans mt-0.5 text-meta text-ink-suave">{detalle}</Text> : null}
      </View>
      {derecha}
    </Pressable>
  );
}

export function Boton({
  children,
  onPress,
  variante = 'primario',
  cargando,
  deshabilitado,
}: {
  children: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'destructivo';
  cargando?: boolean;
  deshabilitado?: boolean;
}) {
  const col = useColores();

  const fondo =
    variante === 'primario' ? 'bg-primary' : variante === 'destructivo' ? 'bg-surface' : 'bg-surface';
  const borde = variante === 'primario' ? '' : 'border border-line';
  const colorTexto =
    variante === 'primario' ? '#FFFFFF' : variante === 'destructivo' ? col.peligro : col.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={cargando || deshabilitado}
      accessibilityRole="button"
      className={`h-12 flex-row items-center justify-center rounded-chip ${fondo} ${borde}`}
      style={{ opacity: cargando || deshabilitado ? 0.55 : 1 }}
    >
      {cargando ? (
        <ActivityIndicator color={variante === 'primario' ? '#FFFFFF' : col.primary} />
      ) : (
        <Text className="text-body font-fuerte" style={{ color: colorTexto }}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Un campo de texto, con el rango que acepta debajo.
 *
 * El rango está SIEMPRE visible, en gris, desde antes de escribir: es una ayuda
 * mientras se escribe y sería un reproche si apareciera recién al equivocarse.
 *
 * Tres estados, y la diferencia entre los dos últimos es la que importa:
 *
 *   ok           El rótulo en gris, con el rango.
 *   implausible  Ámbar. El valor existe pero casi seguro es una errata de
 *                unidad. **Se calcula igual** — poner un techo donde la fórmula
 *                no se rompe sería inventar un límite.
 *   invalido     Rojo. El valor rompe la fórmula o no existe. No se calcula.
 *
 * El rojo de esta app significa que algo no se puede hacer; usarlo para
 * «revisá esto» le sacaría fuerza donde importa.
 */
export const CampoTexto = forwardRef<
  TextInput,
  TextInputProps & {
    etiqueta?: string;
    error?: string;
    /** El rango que acepta, ya en la unidad que se está mostrando. */
    rango?: Rango;
    /** Qué se escribió, para juzgarlo. Se pasa aparte de `value` porque el
     *  valor de pantalla es texto y esto es el número ya parseado. */
    valor?: number;
  }
>(function CampoTexto({ etiqueta, error, rango, valor, ...props }, ref) {
  const col = useColores();

  const v = rango ? evaluarValor(valor, rango) : { estado: 'ok' as const, mensaje: null };
  const borde =
    v.estado === 'invalido' ? col.peligro : v.estado === 'implausible' ? COLOR_SEVERIDAD.media : col.line;

  // Debajo del campo va una sola línea: el mensaje si hay algo que decir, y el
  // rango si no. Las dos juntas serían dos renglones para la misma pregunta.
  const pie = error ?? v.mensaje ?? (rango ? etiquetaRango(rango) : null);
  const colorPie =
    error || v.estado === 'invalido'
      ? col.peligro
      : v.estado === 'implausible'
        ? '#B45309'
        : col.tenue;

  return (
    <View className="mb-3.5">
      {etiqueta ? (
        <Text className="mb-1.5 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
          {etiqueta}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={col.tenue}
        accessibilityLabel={etiqueta}
        accessibilityHint={rango ? `Entre ${etiquetaRango(rango)}` : undefined}
        className="h-12 rounded-chip border bg-surface px-3.5 text-body text-ink"
        style={{ borderColor: borde, borderWidth: v.estado === 'ok' ? 1 : 1.5 }}
        {...props}
      />
      {pie ? (
        <Text
          className={v.mensaje || error ? 'font-sans mt-1 text-meta' : 'font-mono mt-1 text-eyebrow'}
          style={{ color: colorPie }}
        >
          {pie}
        </Text>
      ) : null}
    </View>
  );
});

export function Chip({
  texto,
  activo,
  onPress,
}: {
  texto: string;
  activo?: boolean;
  onPress?: () => void;
}) {
  const col = useColores();

  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              hapticaSeleccion();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: activo }}
      className="rounded-full border px-3 py-1.5"
      style={{
        backgroundColor: activo ? col.primaryLight : col.surface,
        borderColor: activo ? col.primary : col.line,
      }}
    >
      <Text
        className="text-meta font-medio"
        style={{ color: activo ? col.primary : col.inkSuave }}
      >
        {texto}
      </Text>
    </Pressable>
  );
}

export function Cargando() {
  const col = useColores();

  return (
    <View className="flex-1 items-center justify-center bg-paper py-16">
      <ActivityIndicator color={col.primary} />
    </View>
  );
}

/** Estado vacío / error / sin conexión. Un solo componente para las tres cosas
 *  porque estructuralmente son lo mismo: título, explicación y una salida. */
export function Estado({
  titulo,
  detalle,
  accion,
  onAccion,
}: {
  titulo: string;
  detalle: string;
  accion?: string;
  onAccion?: () => void;
}) {
  return (
    <View className="items-center justify-center px-6 py-16">
      <Text className="text-center text-fila font-fuerte text-ink">{titulo}</Text>
      <Text className="font-sans mt-2 text-center text-meta leading-5 text-ink-suave">{detalle}</Text>
      {accion && onAccion ? (
        <View className="mt-5 w-full max-w-[220px]">
          <Boton onPress={onAccion}>{accion}</Boton>
        </View>
      ) : null}
    </View>
  );
}

/** Aviso neutro. Ni tranquiliza ni alarma: se usa cuando falta un dato. */
export function AvisoNeutro({ children }: { children: ReactNode }) {
  const col = useColores();

  return (
    <View
      className="mb-2 rounded-card border border-line bg-surface px-3.5 py-3"
      style={{ borderLeftWidth: 4, borderLeftColor: col.tenue }}
    >
      <Text className="font-sans text-meta leading-5 text-ink">{children}</Text>
    </View>
  );
}
