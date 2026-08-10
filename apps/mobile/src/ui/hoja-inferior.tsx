import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { hapticaSeleccion } from './haptica';
import { useColores } from './tema';

/**
 * Hoja inferior: el menú de acciones que abre el botón `+`.
 *
 * Está hecha con `Modal` y no con `@gorhom/bottom-sheet`, aunque la librería
 * dé una hoja arrastrable que se ve mejor. El motivo es concreto: se probó y
 * en el teléfono **no llegaba a presentarse** — el `+` no abría nada, ni en
 * Inicio ni en el cockpit. En web tampoco, y ahí se había parcheado con este
 * mismo `Modal`.
 *
 * No se puede depurar a ciegas: la única superficie donde verificamos es el
 * navegador, y el fallo era sólo nativo. Entre una hoja vistosa que no abre y
 * un modal que funciona, va el que funciona. Cuando exista un build de
 * desarrollo para probar en el dispositivo, se puede reintentar gorhom.
 */

export function HojaInferior({
  visible,
  onCerrar,
  children,
}: {
  visible: boolean;
  onCerrar: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      {/* Tocar fuera cierra. El `Pressable` interno frena la propagación para
          que tocar la hoja no la cierre. */}
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(18,42,35,0.45)' }}
        onPress={onCerrar}
        accessibilityLabel="Cerrar"
      >
        <Pressable onPress={() => {}} className="rounded-t-sheet bg-surface px-4 pb-8 pt-3">
          {/* El tirador: no arrastra, pero dice "esto se cierra hacia abajo". */}
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-line" />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
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
  const col = useColores();

  return (
    <Pressable
      onPress={() => {
        hapticaSeleccion();
        onPress();
      }}
      accessibilityRole="button"
      className="border-b border-line py-4"
    >
      <Text
        className="text-body font-medio text-ink"
        style={destructiva ? { color: col.peligro } : undefined}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}
