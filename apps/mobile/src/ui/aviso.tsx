import { AnimatePresence, MotiView } from 'moti';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hapticaAdvertencia, hapticaExito, hapticaSeleccion } from './haptica';
import { estiloSombra } from './superficie';
import { FIJO, MOVIMIENTO } from './tokens';

/**
 * El cartelito de «listo» que aparece arriba y se va solo.
 *
 * Antes, guardar hacía `router.back()` y nada más: la pantalla anterior
 * aparecía sin decir si el cambio entró. Esto lo dice, en dos palabras y sin
 * pedir que nadie toque nada.
 *
 * **La regla que gobierna dónde se usa:** un aviso se va a los tres segundos,
 * así que NUNCA puede ser la única confirmación de algo clínico. Renombrar un
 * grupo, sí. Agregar un fármaco, suspenderlo o aceptar una alternativa, no —
 * eso se confirma en pantalla, con el cockpit recalculado a la vista. Si algo
 * cambió la medicación de un paciente, el médico tiene que poder volver a
 * mirarlo, no haberlo alcanzado a leer.
 *
 * Con `accion` (por ejemplo «Deshacer») el aviso dura más y se puede tocar. Eso no
 * lo vuelve la confirmación: suspender un fármaco ya se ve en el cockpit
 * recalculado y queda en el historial; el aviso sólo ofrece la salida rápida.
 *
 * Hecho con moti —que ya estaba instalada— y no con una librería de toasts
 * nativos: las nativas se ven mejor pero no corren en Expo Go, y no se puede
 * verificar lo que no se puede abrir.
 */

const MS_VISIBLE = 2600;

/**
 * Un aviso con salida («Deshacer») dura más: hay que leerlo, decidir y llegar.
 * Tres segundos para eso es una trampa.
 */
const MS_VISIBLE_CON_ACCION = 7000;

/** Alto del encabezado de `Stack`, para que el aviso caiga debajo y no encima. */
const ALTO_ENCABEZADO = 52;

/** `exito` confirma algo guardado; `error` avisa que algo no salió; `info` es neutro. */
export type TipoAviso = 'info' | 'exito' | 'error';

/** Lo que se puede hacer desde el propio aviso, como deshacer lo que acaba de pasar. */
export interface AccionAviso {
  etiqueta: string;
  onPress: () => void;
}

interface Contexto {
  avisar: (texto: string, tipo?: TipoAviso, accion?: AccionAviso) => void;
}

const ContextoAviso = createContext<Contexto>({ avisar: () => {} });

export function useAviso(): Contexto {
  return useContext(ContextoAviso);
}

export function ProveedorAviso({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<{ texto: string; accion?: AccionAviso } | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inset = useSafeAreaInsets();
  const texto = aviso?.texto ?? null;
  const accion = aviso?.accion;

  const avisar = useCallback((t: string, tipo: TipoAviso = 'info', accion?: AccionAviso) => {
    // Un aviso nuevo pisa al anterior en vez de encolarse: dos carteles
    // seguidos obligan a leer el segundo a las apuradas, y el que importa
    // siempre es el último.
    if (reloj.current) clearTimeout(reloj.current);
    if (tipo === 'exito') hapticaExito();
    else if (tipo === 'error') hapticaAdvertencia();
    else hapticaSeleccion();
    setAviso({ texto: t, accion });
    reloj.current = setTimeout(
      () => setAviso(null),
      accion ? MS_VISIBLE_CON_ACCION : MS_VISIBLE,
    );
  }, []);

  return (
    <ContextoAviso.Provider value={{ avisar }}>
      {children}

      <AnimatePresence>
        {texto !== null ? (
          <MotiView
            key="aviso"
            from={{ opacity: 0, translateY: -14 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -14 }}
            transition={{ type: 'timing', duration: MOVIMIENTO.aviso }}
            /*
             * Arriba y no abajo: abajo está el menú, y un cartel sobre el botón
             * central tapa justo lo que se toca para seguir.
             *
             * El desplazamiento salta el encabezado. Pegado al borde quedaba
             * encima del título de la pantalla —«Editar grupo» con «Grupo
             * renombrado» arriba— y sobre el verde de la barra el gris oscuro
             * se lavaba hasta no leerse.
             */
            style={{
              position: 'absolute',
              top: inset.top + ALTO_ENCABEZADO + 10,
              left: 0,
              right: 0,
              alignItems: 'center',
              /* Sin salida no intercepta toques: es información, no un control.
                 Con salida deja pasar los toques de alrededor y atiende sólo
                 los del propio botón. */
              pointerEvents: accion ? 'box-none' : 'none',
            }}
          >
            <View
              className="flex-row items-center overflow-hidden rounded-chip"
              style={{ backgroundColor: FIJO.tinta, ...estiloSombra('alta') }}
            >
              <Text
                className="font-medio px-4 py-2.5 text-meta text-blanco"
                accessibilityLiveRegion="polite"
              >
                {texto}
              </Text>
              {accion ? (
                <Pressable
                  onPress={() => {
                    if (reloj.current) clearTimeout(reloj.current);
                    setAviso(null);
                    hapticaSeleccion();
                    accion.onPress();
                  }}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, right: 8 }}
                  className="py-2.5 pl-1 pr-4"
                >
                  <Text className="font-fuerte text-meta uppercase tracking-wider text-blanco">
                    {accion.etiqueta}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </MotiView>
        ) : null}
      </AnimatePresence>
    </ContextoAviso.Provider>
  );
}
