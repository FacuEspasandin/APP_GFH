import { forwardRef, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useAnimar } from './animacion';
import { hapticaSeleccion } from './haptica';
import { Icono, type NombreIcono } from './iconos';
import { ControlRefrescar } from './refrescar';
import { alEnfocarCampo, ID_BARRA_TECLADO } from './teclado';
import { MOVIMIENTO } from './tokens';

/** Los teclados sin tecla de retorno en iOS: los que necesitan la barra «Siguiente · Listo». */
const TECLADO_NUMERICO = new Set(['numeric', 'number-pad', 'decimal-pad', 'phone-pad']);
import { Superficie, SuperficieTocable } from './superficie';
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
   * pantalla: listas de pacientes y grupos, el cockpit, los hallazgos y la ficha
   * de un fármaco. En un formulario el gesto no tendría nada que refrescar y
   * ofrecerlo sería prometer algo que no pasa.
   *
   * Las restricciones de un fármaco (renal, hepático, embarazo, lactancia,
   * interacciones) NO lo ofrecen: abrirlas descuenta una consulta del plan
   * gratis y su consulta es un POST con efecto, ver `useDetalleRestriccion`.
   */
  onRefrescar?: () => void;
  refrescando?: boolean;
}) {
  const contenido = scroll ? (
    <ScrollView
      contentContainerClassName="px-margen pb-6 pt-3"
      keyboardShouldPersistTaps="handled"
      // iOS corre el contenido para que el campo enfocado quede a la vista. En
      // Android lo hace el sistema (`adjustResize`). Sin esto, un formulario largo
      // dejaba el campo de abajo tapado por el teclado.
      automaticallyAdjustKeyboardInsets
      refreshControl={
        onRefrescar ? <ControlRefrescar refrescando={refrescando} onRefrescar={onRefrescar} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 px-margen pb-6 pt-3">{children}</View>
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
    <SuperficieTocable
      onPress={onPress}
      contenedor="mb-3.5"
      className="flex-row items-center px-3.5 py-3"
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
    </SuperficieTocable>
  );
}

/**
 * El botón. Una sola pieza para toda la app: lo que cambia es el `tamano`, no
 * quién lo dibuja.
 *
 *   normal  48 px, esquina de chip. El de formularios y diálogos.
 *   grande  56 px, píldora. La acción principal de una pantalla (analizar,
 *           calcular, entrar, crear).
 *   chico   40 px, píldora, ancho del contenido. Acción secundaria al costado.
 *
 * Sobre `primary` el texto es `onPrimary`: blanco en claro, verde casi negro
 * en oscuro (el verde de marca se aclara y el blanco dejaría de leerse).
 */
export function Boton({
  children,
  onPress,
  variante = 'primario',
  tamano = 'normal',
  icono,
  cargando,
  deshabilitado,
}: {
  children: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'destructivo';
  tamano?: 'normal' | 'grande' | 'chico';
  /** Ícono a la izquierda del texto. */
  icono?: NombreIcono;
  cargando?: boolean;
  deshabilitado?: boolean;
}) {
  const col = useColores();

  const fondo = variante === 'primario' ? 'bg-primary' : 'bg-surface';
  const borde = variante === 'primario' ? '' : 'border border-line';
  const colorTexto =
    variante === 'primario' ? col.onPrimary : variante === 'destructivo' ? col.peligro : col.ink;
  const forma =
    tamano === 'grande'
      ? 'h-14 w-full gap-3 rounded-full'
      : tamano === 'chico'
        ? 'h-10 gap-2 rounded-full px-6'
        : 'h-12 rounded-control';

  // Cede 3% bajo el dedo y vuelve. Sutil a propósito: en una herramienta clínica
  // un rebote grande se vuelve ruido a la décima vez. Es la misma respuesta que
  // las tarjetas tocables (`SuperficieTocable`).
  const anima = useAnimar();
  const escala = useRef(new Animated.Value(1)).current;
  const hundir = (abajo: boolean) => {
    if (!anima) return;
    Animated.timing(escala, {
      toValue: abajo ? 0.97 : 1,
      duration: MOVIMIENTO.toque,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };
  const claseTexto =
    tamano === 'grande'
      ? 'text-fila font-fuerte'
      : tamano === 'chico'
        ? 'text-meta font-medio'
        : 'text-body font-fuerte';

  return (
    <Animated.View
      style={{ transform: [{ scale: escala }], alignSelf: tamano === 'chico' ? 'flex-start' : 'stretch' }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => hundir(true)}
        onPressOut={() => hundir(false)}
        disabled={cargando || deshabilitado}
        accessibilityRole="button"
        className={`flex-row items-center justify-center ${forma} ${fondo} ${borde}`}
        style={{ opacity: cargando || deshabilitado ? 0.55 : 1 }}
      >
        {cargando ? (
          <ActivityIndicator color={variante === 'primario' ? col.onPrimary : col.primary} />
        ) : (
          <>
            {icono ? <Icono nombre={icono} tamano={tamano === 'chico' ? 16 : 18} color={colorTexto} /> : null}
            <Text className={claseTexto} style={{ color: colorTexto }}>
              {children}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
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
        ? col.aviso
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
        className={
          props.multiline
            ? 'min-h-campo-multilinea rounded-control border bg-surface px-3.5 py-3 text-body text-ink'
            : 'h-12 rounded-control border bg-surface px-3.5 text-body text-ink'
        }
        style={{ borderColor: borde, borderWidth: v.estado === 'ok' ? 1 : 1.5 }}
        // «Listo» y no «return»: en un campo de una línea no hay nada que
        // agregar abajo. Un formulario encadenado lo pisa (ver `useCadena`).
        returnKeyType={props.multiline ? undefined : 'done'}
        // El teclado numérico de iOS no tiene tecla de retorno: la barra de arriba
        // es la única forma de cerrarlo o de pasar al campo siguiente.
        inputAccessoryViewID={TECLADO_NUMERICO.has(props.keyboardType ?? '') ? ID_BARRA_TECLADO : undefined}
        {...props}
        onFocus={(e) => {
          alEnfocarCampo();
          props.onFocus?.(e);
        }}
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

/**
 * Chip: una opción que se prende o se apaga.
 *
 *   suave   Varias a la vez (filtros que se suman). Activo = fondo claro de marca.
 *   solido  Una sola entre varias (filtro de categoría, umbral de edad). Activo = verde de marca.
 *
 * Siempre píldora; el área tocable se agranda para llegar a 44 px.
 */
export function Chip({
  texto,
  activo,
  onPress,
  variante = 'suave',
}: {
  texto: string;
  activo?: boolean;
  onPress?: () => void;
  variante?: 'suave' | 'solido';
}) {
  const col = useColores();
  const solido = variante === 'solido';

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
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole={onPress ? (solido ? 'radio' : 'button') : undefined}
      accessibilityState={{ selected: activo }}
      className="rounded-full border px-3 py-1.5"
      style={{
        backgroundColor: activo ? (solido ? col.primary : col.primaryLight) : col.surface,
        borderColor: activo ? col.primary : col.line,
      }}
    >
      <Text
        className="text-meta font-medio"
        style={{ color: activo ? (solido ? col.onPrimary : col.primary) : col.inkSuave }}
      >
        {texto}
      </Text>
    </Pressable>
  );
}

/**
 * Segmentado: dos o tres opciones excluyentes en un solo bloque (estado de una
 * prescripción, unidad de un análisis). El segmento activo va en verde de marca.
 *
 * `compacto` para un selector chico dentro de un formulario; sin él ocupa todo
 * el ancho y las opciones se reparten por igual.
 */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambiar,
  compacto,
}: {
  opciones: readonly { valor: T; etiqueta: string }[];
  valor: T;
  onCambiar: (v: T) => void;
  compacto?: boolean;
}) {
  const col = useColores();

  return (
    <View
      className={`rounded-chip border p-1 flex-row ${compacto ? 'self-start' : ''}`}
      style={{ backgroundColor: col.surfaceAlt, borderColor: col.line, gap: 2 }}
    >
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => {
              hapticaSeleccion();
              onCambiar(o.valor);
            }}
            hitSlop={compacto ? { top: 6, bottom: 6 } : undefined}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            className={`items-center rounded-chip ${compacto ? 'px-3.5 py-1.5' : 'flex-1 py-2'}`}
            style={{ backgroundColor: activo ? col.primary : 'transparent' }}
          >
            <Text
              className={`${compacto ? 'text-meta' : 'text-body'} ${activo ? 'font-medio' : 'font-sans'}`}
              style={{ color: activo ? col.onPrimary : col.inkSuave }}
            >
              {o.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
        <View className="mt-5 w-full max-w-accion">
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
    <Superficie
      className="mb-3.5 px-3.5 py-3"
      style={{ borderLeftWidth: 4, borderLeftColor: col.tenue }}
    >
      <Text className="font-sans text-meta leading-5 text-ink">{children}</Text>
    </Superficie>
  );
}

/**
 * Aviso de error o de acción irreversible de la INTERFAZ: fondo rojo suave,
 * ícono y título en el rojo oscuro de `peligroInk`.
 *
 * Había seis copias, cada una con su propio borde y su propio `rgba` para el
 * texto. En oscuro el `rgba` de rojo oscuro quedaba sobre fondo rojo oscuro y
 * no se leía; centralizado, el texto sigue al tema.
 *
 * No es gravedad clínica: un hallazgo grave usa la escala de severidad. Este
 * aviso dice «cuidado con lo que hacés» o «esto salió mal».
 */
export function AvisoPeligro({
  titulo,
  detalle,
  className = '',
  children,
}: {
  titulo: string;
  /** Una línea de explicación. Para más (viñetas, un botón) usar `children`. */
  detalle?: string;
  className?: string;
  children?: ReactNode;
}) {
  const col = useColores();

  return (
    <View className={`gap-3 rounded-card p-4 ${className}`} style={{ backgroundColor: col.peligroLight }}>
      <View className="flex-row items-center gap-2">
        <Icono nombre="alerta" tamano={20} color={col.peligroInk} />
        <Text className="flex-1 text-fila font-fuerte" style={{ color: col.peligroInk }}>
          {titulo}
        </Text>
      </View>
      {detalle ? <TextoPeligro>{detalle}</TextoPeligro> : null}
      {children}
    </View>
  );
}

/** Un párrafo dentro de `AvisoPeligro`. */
export function TextoPeligro({ children }: { children: ReactNode }) {
  const col = useColores();
  return (
    <Text className="font-sans text-meta leading-5" style={{ color: col.peligroInk }}>
      {children}
    </Text>
  );
}

/**
 * La barra fija al pie de una pantalla con la acción que sigue (guardar,
 * continuar, aceptar). Un filo arriba la separa del contenido que se desplaza.
 */
export function BarraAccion({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`border-t border-line bg-surface px-margen py-3 ${className}`}>{children}</View>;
}

/**
 * El título de una tarjeta con su etiqueta de estado.
 *
 * La etiqueta va SIEMPRE a la derecha y arriba, a la altura de la primera línea
 * del título, en todas las pantallas. El título ocupa el resto y es el que se
 * parte en dos renglones si no entra: con el texto del sistema grande, la
 * etiqueta bajaba debajo del nombre y cada fila quedaba distinta.
 */
export function TituloConEtiqueta({ titulo, etiqueta }: { titulo: ReactNode; etiqueta?: ReactNode }) {
  return (
    <View className="flex-row items-start gap-2">
      <Text className="flex-1 text-fila font-medio text-ink">{titulo}</Text>
      {etiqueta ? <View className="flex-none">{etiqueta}</View> : null}
    </View>
  );
}
