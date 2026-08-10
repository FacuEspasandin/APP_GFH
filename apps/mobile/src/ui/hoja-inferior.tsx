import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { hapticaSeleccion } from './haptica';
import { Icono, type NombreIcono } from './iconos';
import { useColores } from './tema';

/**
 * Hoja inferior: el menú que abren el botón `+` y el de herramientas.
 *
 * Está hecha con `Modal` y no con `@gorhom/bottom-sheet`, aunque la librería dé
 * una hoja arrastrable que se ve mejor. El motivo es concreto: se probó y en el
 * teléfono **no llegaba a presentarse** — el botón no abría nada. No se puede
 * depurar a ciegas, y entre una hoja vistosa que no abre y un modal que
 * funciona, va el que funciona. Se puede reintentar cuando haya un build de
 * desarrollo donde probarlo en el dispositivo.
 */

export function HojaInferior({
  visible,
  onCerrar,
  titulo,
  children,
}: {
  visible: boolean;
  onCerrar: () => void;
  titulo?: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      {/* Tocar fuera cierra. El Pressable interno frena la propagación para que
          tocar la hoja no la cierre. */}
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(18,42,35,0.45)' }}
        onPress={onCerrar}
        accessibilityLabel="Cerrar"
      >
        <Pressable onPress={() => {}} className="rounded-t-sheet bg-surface px-4 pb-9 pt-3">
          {/* El tirador: no arrastra, pero dice "esto se cierra hacia abajo". */}
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-line" />
          {titulo ? (
            <Text className="mb-1 text-eyebrow font-medio uppercase tracking-wider text-ink-suave">
              {titulo}
            </Text>
          ) : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Una opción de la hoja.
 *
 * El detalle no es decoración: cuatro nombres sueltos obligan a recordar la
 * diferencia entre "Condición y alergia" e "Interacciones". Con una línea de
 * qué hace cada una, se elige sin pensar.
 */
export function OpcionHoja({
  titulo,
  detalle,
  icono,
  onPress,
  destructiva,
  deshabilitada,
}: {
  titulo: string;
  detalle?: string;
  icono?: NombreIcono;
  onPress?: () => void;
  destructiva?: boolean;
  deshabilitada?: boolean;
}) {
  const col = useColores();
  const color = destructiva ? col.peligro : col.ink;

  return (
    <Pressable
      onPress={
        onPress && !deshabilitada
          ? () => {
              hapticaSeleccion();
              onPress();
            }
          : undefined
      }
      disabled={deshabilitada || !onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitada }}
      className="flex-row items-center border-b border-line py-3.5"
      style={{ opacity: deshabilitada ? 0.5 : 1 }}
    >
      {icono ? (
        <View
          className="mr-3 items-center justify-center rounded-chip"
          style={{
            width: 36,
            height: 36,
            backgroundColor: deshabilitada ? col.paper : col.primaryLight,
          }}
        >
          <Icono nombre={icono} tamano={18} color={deshabilitada ? col.tenue : col.primary} />
        </View>
      ) : null}

      <View className="flex-1">
        <Text className="text-body font-medio" style={{ color }}>
          {titulo}
        </Text>
        {detalle ? (
          <Text className="font-sans mt-0.5 text-meta" style={{ color: col.inkSuave }}>
            {detalle}
          </Text>
        ) : null}
      </View>

      {onPress && !deshabilitada ? (
        <Icono nombre="chevron" tamano={16} color={col.tenue} />
      ) : null}
    </Pressable>
  );
}
