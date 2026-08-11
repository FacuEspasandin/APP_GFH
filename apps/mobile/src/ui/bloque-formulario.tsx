import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Superficie } from '@/ui/superficie';

/**
 * Un grupo de campos con título y su exigencia declarada.
 *
 * Existe porque los formularios de la app eran listas planas donde nada
 * distinguía lo que el botón exige de lo que se puede saltear: nombre y altura
 * se veían igual. Decirlo en el título —"Obligatorio", "Recomendado",
 * "Opcional"— ahorra tener que descubrirlo tocando el botón y viendo qué se
 * pone en rojo.
 *
 * "Recomendado" no es un adorno: son los datos que hacen que el motor pueda
 * calcular algo. Sin ellos la app funciona, pero contesta neutro.
 */
export type Exigencia = 'Obligatorio' | 'Recomendado' | 'Opcional';

export function BloqueFormulario({
  titulo,
  exigencia,
  children,
}: {
  titulo: string;
  exigencia?: Exigencia;
  children: ReactNode;
}) {
  return (
    <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3.5">
      <View className="mb-3 flex-row items-baseline justify-between">
        <Text className="text-fila font-fuerte text-ink">{titulo}</Text>
        {exigencia ? (
          <Text className="font-medio text-eyebrow uppercase tracking-wider text-tenue">
            {exigencia}
          </Text>
        ) : null}
      </View>
      {children}
    </Superficie>
  );
}
