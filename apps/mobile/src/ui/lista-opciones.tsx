import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { hapticaSeleccion } from '@/ui/haptica';
import { Icono, type NombreIcono } from '@/ui/iconos';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Un grupo de accesos como UNA tarjeta con divisiones internas.
 *
 * Antes cada fila era su propia tarjeta con su borde y su sombra: doce bordes
 * para doce enlaces, y el Perfil se leía como una pila de objetos sueltos en
 * vez de tres o cuatro conjuntos. La división interna dice lo mismo con una
 * línea de 1px.
 */
export function GrupoOpciones({ children }: { children: ReactNode }) {
  return (
    <Superficie elevacion="plana" className="mb-4">
      {children}
    </Superficie>
  );
}

/**
 * Una fila de acceso.
 *
 * `valor` es la razón de ser de esta pantalla: "Tema · Sistema",
 * "3 dispositivos", "65 años". Varias de las subpantallas de Perfil existían
 * sólo para leer un dato, y mostrarlo acá las vuelve opcionales.
 *
 * Sin `onPress` la fila no es tocable y pierde el chevron: sirve para mostrar
 * algo que no lleva a ningún lado.
 */
export function Opcion({
  titulo,
  valor,
  icono,
  onPress,
  destructiva,
  primera,
}: {
  titulo: string;
  valor?: string | null;
  icono: NombreIcono;
  onPress?: () => void;
  destructiva?: boolean;
  /** La primera de cada grupo no lleva línea arriba. */
  primera?: boolean;
}) {
  const col = useColores();
  const colorTexto = destructiva ? col.peligro : col.ink;

  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              hapticaSeleccion();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={valor ? `${titulo}, ${valor}` : titulo}
      className={`flex-row items-center px-3.5 py-3 ${primera ? '' : 'border-t border-line'}`}
    >
      <View
        className="mr-3 items-center justify-center rounded"
        style={{
          width: 26,
          height: 26,
          backgroundColor: destructiva ? '#FEE2E2' : col.primaryLight,
        }}
      >
        <Icono nombre={icono} tamano={15} color={destructiva ? col.peligro : col.primary} />
      </View>

      <Text className="flex-1 text-body font-medio" style={{ color: colorTexto }}>
        {titulo}
      </Text>

      {valor ? (
        <Text className="font-sans mr-1.5 text-meta text-ink-suave" numberOfLines={1}>
          {valor}
        </Text>
      ) : null}

      {onPress ? <Icono nombre="chevron" tamano={15} color={col.tenue} /> : null}
    </Pressable>
  );
}
