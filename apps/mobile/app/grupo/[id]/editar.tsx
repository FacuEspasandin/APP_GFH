import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import type { Inicio } from '@/api/tipos';
import * as API from '@/api/endpoints';
import { useAviso } from '@/ui/aviso';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { Boton, CampoTexto, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';

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
  const { avisar } = useAviso();
  const [nombre, setNombre] = useState('');

  const { data } = useQuery({ queryKey: ['inicio', ''], queryFn: API.inicio });
  const grupo = data?.grupos.find((g) => g.id === id);

  useEffect(() => {
    if (grupo && nombre === '') setNombre(grupo.nombre);
  }, [grupo, nombre]);

  const invalidar = () => qc.invalidateQueries({ queryKey: ['inicio'] });

  const renombrar = useMutation({
    mutationFn: () => API.renombrarGrupo(id, nombre.trim()),
    onSuccess: async () => {
      await invalidar();
      router.back();
      avisar('Grupo renombrado');
    },
  });

  const eliminar = useMutation({
    mutationFn: () => API.borrarGrupo(id),
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
    <View className="flex-1 bg-paper">
      <EncabezadoApp />
      <Pantalla>
        <Text className="text-fila font-fuerte text-ink">Editar Grupo</Text>
        <Text className="font-sans mb-4 mt-1 text-meta leading-5 text-ink-suave">
          Modificá el nombre del grupo o gestioná su eliminación.
        </Text>

        <Superficie elevacion="media" className="mb-6 p-4">
          <CampoTexto etiqueta="Nombre del grupo" value={nombre} onChangeText={setNombre} />
          <View className="mt-1 items-end">
            <Boton
              onPress={() => renombrar.mutate()}
              cargando={renombrar.isPending}
              deshabilitado={nombre.trim().length === 0 || nombre.trim() === grupo?.nombre}
            >
              Guardar cambios
            </Boton>
          </View>
        </Superficie>

        <View
          className="gap-3 rounded-xl p-4"
          style={{ backgroundColor: '#FFDAD6', borderWidth: 1, borderColor: 'rgba(186,26,26,0.2)' }}
        >
          <View className="flex-row items-center gap-2">
            <Icono nombre="alerta" tamano={18} color="#93000A" />
            <Text className="text-fila font-fuerte" style={{ color: '#93000A' }}>
              Zona de riesgo
            </Text>
          </View>
          <Text className="font-sans text-meta leading-5" style={{ color: 'rgba(147,0,10,0.8)' }}>
            Eliminar este grupo es una acción irreversible. Los pacientes no se borran: quedan sin
            grupo asignado.
          </Text>
          <View className="self-start">
            <Boton variante="destructivo" onPress={confirmarBorrado} cargando={eliminar.isPending}>
              Eliminar grupo
            </Boton>
          </View>
        </View>
      </Pantalla>
    </View>
  );
}
