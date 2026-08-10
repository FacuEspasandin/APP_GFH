import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { api } from '@/api/cliente';
import { AvisoNeutro, Boton, Chip, Eyebrow, Pantalla } from '@/ui/kit';

interface Condicion { id: string; codigo: string; nombre: string; descripcion: string | null }

/** Agregar condición clínica (3.4.1). */
export default function AgregarCondicion() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [elegida, setElegida] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ['cond'], queryFn: () => api.get<Condicion[]>('/catalogo/condiciones') });

  const agregar = useMutation({
    mutationFn: () => api.post(`/pacientes/${pacienteId}/condiciones`, { condicionClinicaId: elegida }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      router.back();
    },
  });

  // Las sintéticas se derivan de datos del paciente, no se cargan a mano.
  const SINTETICAS = ['ADULTO_MAYOR', 'EMBARAZO', 'LACTANCIA'];
  const cargables = data?.filter((c) => !SINTETICAS.includes(c.codigo)) ?? [];

  return (
    <Pantalla>
      <Eyebrow>Condiciones</Eyebrow>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {cargables.map((c) => (
          <Chip key={c.id} texto={c.nombre} activo={elegida === c.id} onPress={() => setElegida(c.id)} />
        ))}
      </View>

      <AvisoNeutro>
        Adulto mayor, embarazo y lactancia se derivan solos de los datos del paciente.
      </AvisoNeutro>

      <View className="mt-2">
        <Boton onPress={() => agregar.mutate()} cargando={agregar.isPending} deshabilitado={!elegida}>
          Agregar condición
        </Boton>
      </View>
    </Pantalla>
  );
}
