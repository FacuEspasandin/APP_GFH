import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { hapticaSeleccion } from './haptica';
import { Icono, type NombreIcono } from './iconos';
import { useColores } from './tema';

/**
 * Hoja inferior: el menú que abren el botón `+` y el de herramientas.
 *
 * Estuvo hecha con `Modal` durante un tiempo. `@gorhom/bottom-sheet` se había
 * intentado antes y no llegaba a presentarse —el botón no abría nada— y quedó
 * escrito que se reintentara cuando hubiera un build de desarrollo donde
 * poder verlo. Ahora lo hay.
 *
 * Lo que gana: se arrastra de verdad, con inercia y con un fondo que se
 * oscurece de a poco en vez de aparecer de golpe. El tirador dejó de ser un
 * dibujo que decía «esto se cierra hacia abajo» para ser algo que se puede
 * agarrar.
 *
 * La API no cambió —`visible` y `onCerrar`— así que ninguna de las pantallas
 * que la usan se tocó.
 */

/** Sin `snapPoints` fijos: la hoja mide su contenido. El menú del `+` tiene tres
 *  opciones y el de herramientas seis, y una altura fija dejaría a uno con un
 *  hueco abajo o al otro cortado. */
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
  const hoja = useRef<BottomSheet>(null);

  /* `visible` es la fuente de verdad y viene de la pantalla; la hoja se comanda
     desde ese estado. Al revés —dejar que la hoja mande— se desincroniza
     apenas alguien la cierra arrastrando. */
  useEffect(() => {
    if (visible) hoja.current?.expand();
    else hoja.current?.close();
  }, [visible]);

  const fondo = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
        pressBehavior="close"
      />
    ),
    [],
  );

  if (!visible) return null;

  return (
    <BottomSheet
      ref={hoja}
      index={0}
      enablePanDownToClose
      enableDynamicSizing
      onClose={onCerrar}
      backdropComponent={fondo}
      backgroundStyle={{ borderTopLeftRadius: 22, borderTopRightRadius: 22 }}
      handleIndicatorStyle={{ width: 40, height: 4 }}
    >
      <BottomSheetView className="px-4 pb-9 pt-1">
        {titulo ? (
          <Text className="mb-1 text-eyebrow font-medio uppercase tracking-wider text-ink-suave">
            {titulo}
          </Text>
        ) : null}
        {children}
      </BottomSheetView>
    </BottomSheet>
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
