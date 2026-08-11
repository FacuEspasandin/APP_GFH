import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Chip, Pantalla } from '@/ui/kit';
import { useTema } from '@/ui/tema';

const OPCIONES = [60, 65, 70, 75, 80];

/**
 * Umbral de adulto mayor.
 *
 * Estaba enterrado dentro de "Tema y notificaciones" pese a no ser una
 * preferencia estética: decide desde qué edad se disparan las alertas de
 * medicación inapropiada en el anciano.
 */
export default function Umbral() {
  const { configuracion } = useTema();
  const qc = useQueryClient();
  const [elegido, setElegido] = useState<number | null>(null);

  const actual = elegido ?? configuracion?.umbralAdultoMayor ?? 65;

  const guardar = (n: number) => {
    setElegido(n);
    void api
      .patch('/perfil/configuracion', { umbralAdultoMayor: n })
      .then(() => qc.invalidateQueries({ queryKey: ['configuracion'] }));
  };

  return (
    <Pantalla>
      <BloqueFormulario titulo="Desde qué edad">
        <View className="flex-row flex-wrap gap-2">
          {OPCIONES.map((n) => (
            <Chip
              key={n}
              texto={`${n} años`}
              activo={actual === n}
              onPress={() => guardar(n)}
            />
          ))}
        </View>
        <Text className="font-sans mt-3 text-meta leading-5 text-ink-suave">
          Desde esta edad se aplican las alertas de medicación inapropiada en el anciano. En
          geriatría todos los pacientes superan los 65 y la alerta se vuelve ruido: subirlo la
          devuelve a ser informativa.
        </Text>
      </BloqueFormulario>
    </Pantalla>
  );
}
