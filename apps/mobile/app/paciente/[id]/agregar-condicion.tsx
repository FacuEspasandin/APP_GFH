import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { useValorDemorado } from '@/ui/demora';
import { Boton, CampoTexto, Chip, Pantalla } from '@/ui/kit';

interface Condicion { id: string; codigo: string; nombre: string; descripcion: string | null }

/** Agregar condición clínica (3.4.1). */
export default function AgregarCondicion() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [elegida, setElegida] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const filtro = useValorDemorado(texto.trim().toLowerCase());

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

  // Con el catálogo entero volcado como chips, encontrar una era leerlas
  // todas. El buscador aparece recién cuando hay suficientes para perderse.
  const visibles =
    filtro.length >= 2
      ? cargables.filter((c) => c.nombre.toLowerCase().includes(filtro))
      : cargables;

  return (
    <Pantalla>
      <BloqueFormulario titulo="Condición" exigencia="Obligatorio">
        {cargables.length > 10 ? (
          <CampoTexto
            value={texto}
            onChangeText={setTexto}
            placeholder="Buscar condición"
            autoCapitalize="none"
          />
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          {visibles.map((c) => (
            <Chip
              key={c.id}
              texto={c.nombre}
              activo={elegida === c.id}
              onPress={() => setElegida(c.id)}
            />
          ))}
        </View>

        {visibles.length === 0 ? (
          <Text className="font-sans text-meta text-ink-suave">
            Sin coincidencias para el texto buscado.
          </Text>
        ) : null}
      </BloqueFormulario>

      <BloqueFormulario titulo="Las que no se cargan">
        <Text className="font-sans text-meta leading-5 text-ink-suave">
          Adulto mayor, embarazo y lactancia se derivan solos de los datos del paciente: aparecen y
          desaparecen con la edad y la semana de gestación, no se agregan a mano.
        </Text>
      </BloqueFormulario>

      <Boton onPress={() => agregar.mutate()} cargando={agregar.isPending} deshabilitado={!elegida}>
        Agregar condición
      </Boton>
    </Pantalla>
  );
}
