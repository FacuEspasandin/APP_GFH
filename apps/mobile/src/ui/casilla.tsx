import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { hapticaSeleccion } from './haptica';
import { Icono } from './iconos';
import { useColores } from './tema';

/**
 * La casilla de aceptación: «Entiendo y acepto…».
 *
 * Es la misma del disclaimer de primer ingreso, sacada a una pieza porque ahora
 * la usan también los permisos de Vera y de fotos y el registro. El texto va de
 * hijo —y no como `string`— porque en el registro lleva dos enlaces adentro.
 *
 * Marcar no hace nada solo: la casilla sólo habilita el botón que viene después.
 * Que el permiso se dé es un acto aparte, y se ve.
 */
export function CasillaAceptacion({
  marcada,
  onAlternar,
  children,
  etiquetaAccesible,
}: {
  marcada: boolean;
  onAlternar: () => void;
  children: ReactNode;
  /** Para el lector de pantalla cuando los hijos son texto con enlaces. */
  etiquetaAccesible?: string;
}) {
  const col = useColores();

  return (
    <Pressable
      onPress={() => {
        hapticaSeleccion();
        onAlternar();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={etiquetaAccesible}
      className="flex-row items-start gap-3"
    >
      <View
        className="mt-0.5 h-5 w-5 items-center justify-center rounded-casilla border-2"
        style={{
          borderColor: marcada ? col.primary : col.tenue,
          backgroundColor: marcada ? col.primary : 'transparent',
        }}
      >
        {marcada ? <Icono nombre="check" tamano={14} color={col.onPrimary} /> : null}
      </View>
      <View className="flex-1">{children}</View>
    </Pressable>
  );
}
