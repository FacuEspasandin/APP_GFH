import { MotiView } from 'moti';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';

import { useTema } from './tema';
import { FIJO, PALETA, RADIO_TARJETA } from './tokens';

/**
 * Superficies del sistema, con tres niveles de elevación y respuesta al tacto.
 *
 * Por qué existe: antes toda la app era la misma caja blanca con el mismo
 * borde. Un fármaco sin hallazgos y una interacción grave se veían igual salvo
 * por una franja de 4px, así que nada guiaba el ojo hacia lo urgente. La
 * jerarquía la da la elevación, no el color — el color acá significa gravedad
 * y no se puede gastar en decorar.
 *
 * La animación al presionar es lo que separa una app de una página web: el
 * elemento cede bajo el dedo. Es sutil a propósito (3%): en una herramienta
 * clínica un rebote grande se vuelve ruido a la décima vez que se toca.
 */

/**
 * En iOS la sombra la dibuja la propia capa de la vista, y `overflow: hidden` la
 * recorta: la tarjeta quedaba sin sombra. Android (`elevation`) no tiene el
 * problema. Por eso sólo se recorta en Android; en iOS nada de adentro sobresale
 * del borde (los hijos no llevan fondo propio de borde a borde).
 */
const RECORTA = Platform.OS === 'ios' ? '' : 'overflow-hidden';

export type Elevacion = 'plana' | 'media' | 'alta';

/**
 * Sombras verdosas y no negras: el negro sobre el papel verde grisáceo del
 * sistema se ve sucio, como si la tarjeta estuviera manchada. El color es el de
 * la tinta (`FIJO.tinta`), el mismo en toda la app.
 *
 * Valores de `docs/rediseno-visual/02-tokens-objetivo.md`. Son los únicos de
 * la app: ninguna pantalla escribe `shadow*` a mano, usa `Superficie` o
 * `estiloSombra` (aviso flotante, barra inferior).
 *
 * `elevation` es lo único que Android entiende (no tiene radio ni opacidad): se
 * eligió para que el escalón entre niveles se note igual que en iOS.
 */
const SOMBRAS: Record<Elevacion, ViewStyle> = {
  plana: {
    shadowColor: FIJO.tinta,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  media: {
    shadowColor: FIJO.tinta,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  alta: {
    shadowColor: FIJO.tinta,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 12,
  },
};

/** La sombra de un nivel, para lo que flota sin ser una `Superficie` (aviso, barra). */
export function estiloSombra(elevacion: Elevacion): ViewStyle {
  return SOMBRAS[elevacion];
}

/**
 * En oscuro la sombra casi no se ve: la elevación la marca el fondo (`surface`
 * sobre `paper`) y un filo de 1 px que reemplaza al borde que tenían las
 * tarjetas. En claro no hace falta: la sombra alcanza.
 */
function useFilo(): ViewStyle | null {
  const { oscuro } = useTema();
  return oscuro ? { borderWidth: 1, borderColor: PALETA.oscuro.line } : null;
}

/**
 * Franja de color en el borde izquierdo de una tarjeta (gravedad, estado).
 *
 * Sigue la curva de la tarjeta: como `Superficie` no recorta en iOS (para no
 * perder la sombra), una franja recta sobresalía de las esquinas redondeadas.
 * `absoluta` la pega al borde cuando la tarjeta no es una fila.
 */
export function FranjaLateral({ color, absoluta }: { color: string; absoluta?: boolean }) {
  return (
    <View
      style={{
        width: 4,
        backgroundColor: color,
        borderTopLeftRadius: RADIO_TARJETA,
        borderBottomLeftRadius: RADIO_TARJETA,
        ...(absoluta ? { position: 'absolute', top: 0, bottom: 0, left: 0 } : null),
      }}
    />
  );
}

export function Superficie({
  children,
  elevacion = 'plana',
  className = '',
  style,
}: {
  children: ReactNode;
  elevacion?: Elevacion;
  className?: string;
  style?: ViewStyle;
}) {
  const filo = useFilo();
  return (
    <View
      className={`${RECORTA} rounded-card bg-surface ${className}`}
      style={[SOMBRAS[elevacion], filo, style]}
    >
      {children}
    </View>
  );
}

/**
 * Superficie tocable. Se hunde levemente mientras el dedo está apoyado.
 *
 * En web no se anima: `moti` depende de Reanimated, cuyas animaciones no
 * terminan de ejecutarse ahí y dejarían el elemento a media escala.
 */
const ANIMA = Platform.OS !== 'web';

export function SuperficieTocable({
  children,
  onPress,
  elevacion = 'plana',
  className = '',
  contenedor = '',
  estiloContenedor,
  style,
  accesibilidad,
}: {
  children: ReactNode;
  onPress?: () => void;
  elevacion?: Elevacion;
  /** Cómo se ordena el CONTENIDO de la tarjeta: padding, dirección, alineación. */
  className?: string;
  /**
   * Cómo se ubica la tarjeta DENTRO de su padre: `flex-1`, anchos mínimos,
   * márgenes.
   *
   * Va separado porque quien participa del layout del padre es el `Pressable`
   * de afuera, no la superficie de adentro. Mandar `flex-1` por `className` lo
   * aplica al `View` interno y el `Pressable` queda en `flex: 0 0 auto`: la
   * tarjeta se dimensiona por su texto y una grilla de cuatro sale despareja.
   */
  contenedor?: string;
  /** Lo mismo que `contenedor` cuando la medida no cabe en una clase (`width: '48%'`). */
  estiloContenedor?: ViewStyle;
  style?: ViewStyle;
  accesibilidad?: string;
}) {
  const [presionada, setPresionada] = useState(false);
  const filo = useFilo();

  const contenido = (
    <View
      className={`${RECORTA} rounded-card bg-surface ${className}`}
      style={[SOMBRAS[elevacion], filo, style]}
    >
      {children}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onPressIn={() => setPresionada(true)}
      onPressOut={() => setPresionada(false)}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accesibilidad}
      className={contenedor}
      style={estiloContenedor}
    >
      {ANIMA ? (
        <MotiView
          style={{ flex: 1 }}
          animate={{ scale: presionada ? 0.97 : 1, opacity: presionada ? 0.92 : 1 }}
          transition={{ type: 'timing', duration: 120 }}
        >
          {contenido}
        </MotiView>
      ) : (
        contenido
      )}
    </Pressable>
  );
}
