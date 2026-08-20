import { AnimatePresence, MotiView } from 'moti';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hapticaSeleccion } from './haptica';

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
 * Hecho con moti —que ya estaba instalada— y no con una librería de toasts
 * nativos: las nativas se ven mejor pero no corren en Expo Go, y no se puede
 * verificar lo que no se puede abrir.
 */

const MS_VISIBLE = 2600;

/** Alto del encabezado de `Stack`, para que el aviso caiga debajo y no encima. */
const ALTO_ENCABEZADO = 52;

interface Contexto {
  avisar: (texto: string) => void;
}

const ContextoAviso = createContext<Contexto>({ avisar: () => {} });

export function useAviso(): Contexto {
  return useContext(ContextoAviso);
}

export function ProveedorAviso({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState<string | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inset = useSafeAreaInsets();

  const avisar = useCallback((t: string) => {
    // Un aviso nuevo pisa al anterior en vez de encolarse: dos carteles
    // seguidos obligan a leer el segundo a las apuradas, y el que importa
    // siempre es el último.
    if (reloj.current) clearTimeout(reloj.current);
    hapticaSeleccion();
    setTexto(t);
    reloj.current = setTimeout(() => setTexto(null), MS_VISIBLE);
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
            transition={{ type: 'timing', duration: 220 }}
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
              /* No intercepta toques: es información, no un control. */
              pointerEvents: 'none',
            }}
          >
            <Text
              className="font-medio overflow-hidden rounded-chip px-4 py-2.5 text-meta text-white"
              style={{
                backgroundColor: '#122A23',
                shadowColor: '#000',
                shadowOpacity: 0.3,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
              accessibilityLiveRegion="polite"
            >
              {texto}
            </Text>
          </MotiView>
        ) : null}
      </AnimatePresence>
    </ContextoAviso.Provider>
  );
}
