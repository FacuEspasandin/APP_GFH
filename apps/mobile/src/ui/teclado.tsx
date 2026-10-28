import { useCallback, useRef, useSyncExternalStore } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  Text,
  View,
  type TextInput,
} from 'react-native';

import { hapticaSeleccion } from './haptica';
import { useColores } from './tema';

/**
 * El teclado: pasar de un campo al siguiente y poder cerrarlo.
 *
 * El problema real: en iOS el teclado numérico NO tiene tecla de retorno. Un
 * formulario con tres números (edad, peso, creatinina) obligaba a tocar cada
 * campo, y para ver el resultado había que tocar afuera a ciegas. En Android el
 * teclado sí trae «siguiente / listo».
 *
 * Dos piezas:
 *
 *   `useCadena(n)`   para formularios con varios campos: cada uno sabe cuál sigue.
 *                    En teclados con tecla de retorno es «Siguiente» / «Listo»; en
 *                    iOS numérico lo hace la barra de abajo.
 *   `BarraTeclado`   la barra «Siguiente · Listo» sobre el teclado de iOS. Se
 *                    monta una sola vez en la raíz de la app. «Listo» cierra el
 *                    teclado, que en una calculadora es lo mismo que «calcular»:
 *                    el resultado ya está a la vista mientras se escribe.
 */

/** El identificador que une cada campo con la barra. Un solo valor para toda la app. */
export const ID_BARRA_TECLADO = 'barra-teclado';

// --- Quién es el siguiente ----------------------------------------------------
//
// Es estado global y no de React a propósito: la barra vive en la raíz, fuera del
// árbol de cualquier formulario, y el campo enfocado es una sola cosa a la vez.

let siguiente: (() => void) | null = null;
const oyentes = new Set<() => void>();

function fijarSiguiente(fn: (() => void) | null): void {
  siguiente = fn;
  oyentes.forEach((o) => o());
}

function suscribir(o: () => void): () => void {
  oyentes.add(o);
  return () => oyentes.delete(o);
}

/** Lo que `CampoTexto` llama al recibir el foco: sin cadena, no hay «siguiente». */
export function alEnfocarCampo(): void {
  fijarSiguiente(null);
}

export function BarraTeclado() {
  const col = useColores();
  const hay = useSyncExternalStore(
    suscribir,
    () => siguiente !== null,
    () => false,
  );

  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={ID_BARRA_TECLADO}>
      <View
        className="flex-row items-center justify-between border-t px-margen"
        style={{ backgroundColor: col.surface, borderColor: col.line, height: 44 }}
      >
        {hay ? (
          <Pressable
            onPress={() => {
              hapticaSeleccion();
              siguiente?.();
            }}
            accessibilityRole="button"
            accessibilityLabel="Campo siguiente"
            hitSlop={8}
          >
            <Text className="text-body font-medio" style={{ color: col.primary }}>
              Siguiente
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          onPress={() => Keyboard.dismiss()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar el teclado"
          hitSlop={8}
        >
          <Text className="text-body font-fuerte" style={{ color: col.primary }}>
            Listo
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

// --- La cadena ---------------------------------------------------------------

/**
 * Los props que hay que darle a cada campo de un formulario para que encadenen.
 *
 * ```tsx
 * const cadena = useCadena(3);
 * <CampoTexto {...cadena(0)} etiqueta="Edad" />
 * <CampoTexto {...cadena(1)} etiqueta="Peso" />
 * <CampoTexto {...cadena(2)} etiqueta="Creatinina" />
 * ```
 *
 * El último cierra el teclado en vez de saltar. Los campos se numeran en el
 * orden en que se leen, no en el de montaje.
 */
export function useCadena(cantidad: number) {
  const refs = useRef<Array<TextInput | null>>([]);

  return useCallback(
    (i: number) => {
      const ultimo = i >= cantidad - 1;
      const irAlSiguiente = () => refs.current[i + 1]?.focus();

      return {
        ref: (r: TextInput | null) => {
          refs.current[i] = r;
        },
        returnKeyType: ultimo ? ('done' as const) : ('next' as const),
        blurOnSubmit: ultimo,
        onSubmitEditing: ultimo ? () => Keyboard.dismiss() : irAlSiguiente,
        // Se pisa lo que puso `CampoTexto` (sin siguiente) con el siguiente real.
        onFocus: () => {
          fijarSiguiente(ultimo ? null : irAlSiguiente);
        },
      };
    },
    [cantidad],
  );
}
