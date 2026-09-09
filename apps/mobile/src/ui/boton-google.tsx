import { ActivityIndicator, Pressable, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColores } from './tema';

/**
 * El logo de Google es de cuatro colores fijos por norma de marca — no entra
 * en el sistema de íconos de un solo trazo (`iconos.tsx`), que asume
 * `currentColor` porque son formas propias, no una marca de un tercero.
 */
function LogoGoogle({ tamano = 18 }: { tamano?: number }) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.9-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-1.8 13.6-4.9l-6.3-5.3C29.3 35.6 26.8 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.2l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.3 5.3C39.9 37 44 31 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </Svg>
  );
}

export function BotonGoogle({
  onPress,
  cargando,
  texto = 'Continuar con Google',
}: {
  onPress: () => void;
  cargando?: boolean;
  texto?: string;
}) {
  const col = useColores();

  return (
    <Pressable
      onPress={onPress}
      disabled={cargando}
      accessibilityRole="button"
      accessibilityLabel={texto}
      className="h-14 flex-row items-center justify-center gap-2.5 rounded-full border"
      style={{ borderColor: col.line, backgroundColor: col.surface, opacity: cargando ? 0.6 : 1 }}
    >
      {cargando ? (
        <ActivityIndicator color={col.ink} />
      ) : (
        <>
          <LogoGoogle tamano={18} />
          <Text className="text-fila font-medio text-ink">{texto}</Text>
        </>
      )}
    </Pressable>
  );
}
