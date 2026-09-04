import { useQueryClient } from '@tanstack/react-query';
import * as API from '@/api/endpoints';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icono } from '@/ui/iconos';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Pantalla } from '@/ui/kit';
import { useColores, useTema } from '@/ui/tema';

const OPCIONES = [60, 65, 70, 75, 80];

/**
 * Umbral de adulto mayor.
 *
 * Estaba enterrado dentro de "Tema y notificaciones" pese a no ser una
 * preferencia estética: decide desde qué edad se disparan las alertas de
 * medicación inapropiada en el anciano.
 */
export default function Umbral() {
  const col = useColores();
  const { configuracion } = useTema();
  const qc = useQueryClient();
  const [elegido, setElegido] = useState<number | null>(null);

  const actual = elegido ?? configuracion?.umbralAdultoMayor ?? 65;

  const guardar = (n: number) => {
    setElegido(n);
    void API.guardarConfiguracion({ umbralAdultoMayor: n })
      .then(() => qc.invalidateQueries({ queryKey: ['configuracion'] }));
  };

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Umbral de edad" />
      <Pantalla>
        <Text className="mb-1 text-body text-ink">Seleccionar umbral (años)</Text>
        <Text className="font-sans mb-4 text-meta leading-5 text-ink-suave">
          Desde esta edad se aplican las alertas de medicación inapropiada en el anciano. En
          geriatría todos los pacientes superan los 65 y la alerta se vuelve ruido: subirlo la
          devuelve a ser informativa.
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {OPCIONES.map((n) => {
            const activo = actual === n;
            return (
              <Pressable
                key={n}
                onPress={() => guardar(n)}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
                className="rounded-full border px-6 py-2.5"
                style={{
                  backgroundColor: activo ? '#005228' : col.surface,
                  borderColor: activo ? '#005228' : col.line,
                }}
              >
                <Text
                  className="text-meta font-medio"
                  style={{ color: activo ? '#FFFFFF' : col.ink }}
                >
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          className="mt-6 flex-row gap-2.5 rounded-md px-4 py-4"
          style={{ backgroundColor: col.paper, borderLeftWidth: 4, borderLeftColor: '#0EA5E9' }}
        >
          <Icono nombre="info" tamano={20} color="#0EA5E9" />
          <View className="flex-1">
            <Text className="mb-1 text-fila font-fuerte text-ink">Impacto clínico</Text>
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              Modificar este umbral ajusta la sensibilidad de las alertas de Medicamentos
              Potencialmente Inapropiados (MPI). Un umbral más bajo aumenta la cantidad de alertas
              generadas; uno más alto las reduce, enfocándose en la población de mayor edad.
            </Text>
          </View>
        </View>
      </Pantalla>
    </View>
  );
}
