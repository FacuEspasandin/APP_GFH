import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { Inicio } from '@/api/tipos';
import { AvisoNeutro, Boton, CampoTexto, Eyebrow, Pantalla } from '@/ui/kit';

/** Editar / eliminar grupo (2.7 y 2.8). */
export default function EditarGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');

  const { data } = useQuery({ queryKey: ['inicio'], queryFn: () => api.get<Inicio>('/inicio') });
  const grupo = data?.grupos.find((g) => g.id === id);

  useEffect(() => {
    if (grupo && nombre === '') setNombre(grupo.nombre);
  }, [grupo, nombre]);

  const renombrar = useMutation({
    mutationFn: () => api.patch(`/grupos/${id}`, { nombre: nombre.trim() }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      router.back();
    },
  });

  const eliminar = useMutation({
    mutationFn: () => api.delete(`/grupos/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      router.back();
    },
  });

  const confirmarBorrado = () => {
    Alert.alert(
      'Eliminar grupo',
      `Los ${grupo?.pacientes.length ?? 0} pacientes NO se borran: quedan sin grupo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => eliminar.mutate() },
      ],
    );
  };

  return (
    <Pantalla>
      <CampoTexto etiqueta="Nombre del grupo" value={nombre} onChangeText={setNombre} />
      <Boton onPress={() => renombrar.mutate()} cargando={renombrar.isPending} deshabilitado={!nombre.trim()}>
        Guardar
      </Boton>

      <View className="mt-8" />
      <Eyebrow>Zona de riesgo</Eyebrow>
      <AvisoNeutro>
        Eliminar el grupo no borra a sus pacientes: quedan en «sin grupo». Un grupo es organización,
        no un dato clínico.
      </AvisoNeutro>
      <View className="mt-2">
        <Boton variante="destructivo" onPress={confirmarBorrado} cargando={eliminar.isPending}>
          Eliminar grupo
        </Boton>
      </View>

      {grupo ? (
        <Text className="font-sans mt-4 px-1 text-meta text-ink-suave">
          {grupo.pacientes.length} paciente{grupo.pacientes.length === 1 ? '' : 's'} en este grupo.
        </Text>
      ) : null}
    </Pantalla>
  );
}
