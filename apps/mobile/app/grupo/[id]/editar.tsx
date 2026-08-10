import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { api } from '@/api/cliente';
import type { Inicio } from '@/api/tipos';
import { AvisoNeutro, Boton, CampoTexto, Pantalla } from '@/ui/kit';

/**
 * Renombrar o eliminar un grupo (2.7 y 2.8).
 *
 * Salió del detalle del grupo a una pantalla propia: entrar al grupo es lo
 * habitual, editarlo es la excepción, y tenerlos juntos hacía que compitieran.
 */
export default function EditarGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');

  const { data } = useQuery({ queryKey: ['inicio', ''], queryFn: () => api.get<Inicio>('/inicio') });
  const grupo = data?.grupos.find((g) => g.id === id);

  useEffect(() => {
    if (grupo && nombre === '') setNombre(grupo.nombre);
  }, [grupo, nombre]);

  const invalidar = () => qc.invalidateQueries({ queryKey: ['inicio'] });

  const renombrar = useMutation({
    mutationFn: () => api.patch(`/grupos/${id}`, { nombre: nombre.trim() }),
    onSuccess: async () => {
      await invalidar();
      router.back();
    },
  });

  const eliminar = useMutation({
    mutationFn: () => api.delete(`/grupos/${id}`),
    onSuccess: async () => {
      await invalidar();
      // Dos veces: se sale de esta pantalla y del detalle del grupo, que ya no
      // existe. Quedarse ahí mostraría un grupo borrado.
      router.back();
      router.back();
    },
  });

  const confirmarBorrado = () => {
    Alert.alert(
      'Eliminar grupo',
      'Los pacientes no se borran: quedan sin grupo asignado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => eliminar.mutate() },
      ],
    );
  };

  return (
    <Pantalla>
      <CampoTexto etiqueta="Nombre del grupo" value={nombre} onChangeText={setNombre} />

      <Boton
        onPress={() => renombrar.mutate()}
        cargando={renombrar.isPending}
        deshabilitado={nombre.trim().length === 0 || nombre.trim() === grupo?.nombre}
      >
        Guardar
      </Boton>

      <AvisoNeutro>
        Al eliminar el grupo, sus pacientes quedan sin grupo asignado. No se borra ningún paciente.
      </AvisoNeutro>

      <Boton variante="destructivo" onPress={confirmarBorrado} cargando={eliminar.isPending}>
        Eliminar grupo
      </Boton>
    </Pantalla>
  );
}
