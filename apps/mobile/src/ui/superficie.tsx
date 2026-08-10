import { MotiView } from 'moti';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';

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

export type Elevacion = 'plana' | 'media' | 'alta';

/**
 * Sombras verdosas y no negras: el negro sobre el papel verde grisáceo del
 * sistema se ve sucio, como si la tarjeta estuviera manchada.
 */
const SOMBRAS: Record<Elevacion, ViewStyle> = {
  plana: {
    shadowColor: '#122A23',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  media: {
    shadowColor: '#122A23',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  alta: {
    shadowColor: '#122A23',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 8,
  },
};

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
  return (
    <View
      className={`overflow-hidden rounded-card bg-surface ${className}`}
      style={[SOMBRAS[elevacion], style]}
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
  style,
  accesibilidad,
}: {
  children: ReactNode;
  onPress?: () => void;
  elevacion?: Elevacion;
  className?: string;
  style?: ViewStyle;
  accesibilidad?: string;
}) {
  const [presionada, setPresionada] = useState(false);

  const contenido = (
    <View
      className={`overflow-hidden rounded-card bg-surface ${className}`}
      style={[SOMBRAS[elevacion], style]}
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
    >
      {ANIMA ? (
        <MotiView
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
