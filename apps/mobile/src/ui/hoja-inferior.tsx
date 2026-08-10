import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { hapticaSeleccion } from './haptica';
import { coloresChrome, useTema } from './tema';

/**
 * Hoja inferior.
 *
 * Reemplaza a los `Modal` que dibujaban una hoja a mano. La diferencia no es
 * estética: la hoja real se arrastra, sigue al dedo y se cierra con el gesto
 * que el usuario ya tiene aprendido. El modal sólo aparecía y desaparecía.
 *
 * Se maneja por `visible` y no por ref para que las pantallas sigan usando el
 * mismo `useState` que ya tenían — cambiar el modal por esto no cambia cómo se
 * lo llama.
 *
 * En web se usa el modal: `@gorhom/bottom-sheet` se monta pero no llega a
 * presentarse sobre `react-native-web`, y una hoja que no abre deja la pantalla
 * sin su menú. Web es la superficie donde verificamos, así que ahí tiene que
 * funcionar aunque sea sin el gesto.
 */

const NATIVO = Platform.OS !== 'web';

export function HojaInferior({
  visible,
  onCerrar,
  children,
}: {
  visible: boolean;
  onCerrar: () => void;
  children: ReactNode;
}) {
  const ref = useRef<BottomSheetModal>(null);
  const { oscuro } = useTema();
  const c = coloresChrome(oscuro);

  useEffect(() => {
    if (!NATIVO) return;
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const fondo = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />
    ),
    [],
  );

  if (!NATIVO) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(18,42,35,0.35)' }}
          onPress={onCerrar}
        >
          <View className="rounded-t-sheet bg-surface px-4 pb-8 pt-3">
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-line" />
            {children}
          </View>
        </Pressable>
      </Modal>
    );
  }

  return (
    <BottomSheetModal
      ref={ref}
      enablePanDownToClose
      enableDynamicSizing
      backdropComponent={fondo}
      onDismiss={onCerrar}
      backgroundStyle={{ backgroundColor: oscuro ? '#14211C' : '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: c.tabInactivo }}
    >
      {/* `BottomSheetView` y no un `View` común: es el que reporta el alto del
          contenido, y sin esa medición `enableDynamicSizing` deja la hoja en
          altura cero — se presenta, pero no se ve nada. */}
      <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 }}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

/** Una opción de la hoja. Cierra sola: ninguna deja la hoja abierta detrás. */
export function OpcionHoja({
  titulo,
  onPress,
  destructiva,
}: {
  titulo: string;
  onPress: () => void;
  destructiva?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        hapticaSeleccion();
        onPress();
      }}
      accessibilityRole="button"
      className="border-b border-line py-3.5"
    >
      <Text
        className="text-body font-medio"
        style={destructiva ? { color: '#991B1B' } : undefined}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}
