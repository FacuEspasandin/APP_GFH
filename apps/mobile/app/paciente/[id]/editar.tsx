import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { Inicio } from '@/api/tipos';
import { CampoFecha } from '@/ui/campo-fecha';
import { aTexto, validarFecha } from '@/ui/fecha';
import { AvisoNeutro, Boton, CampoTexto, Cargando, Chip, Eyebrow, Pantalla } from '@/ui/kit';

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  documento: string | null;
  fechaNacimiento: string;
  sexo: 'M' | 'F' | 'OTRO';
  alturaCm: number | null;
  grupoId: string | null;
}

/** Editar y eliminar paciente (2.9). */
export default function EditarPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['paciente', id],
    queryFn: () => api.get<Paciente>(`/pacientes/${id}`),
    enabled: Boolean(id),
  });
  const { data: inicio } = useQuery({ queryKey: ['inicio'], queryFn: () => api.get<Inicio>('/inicio') });

  const [c, setC] = useState({ nombre: '', apellido: '', documento: '', alturaCm: '', fechaNacimiento: '' });
  const [sexo, setSexo] = useState<'M' | 'F' | 'OTRO'>('F');
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (!data || cargado) return;
    setC({
      nombre: data.nombre,
      apellido: data.apellido,
      documento: data.documento ?? '',
      alturaCm: data.alturaCm ? String(data.alturaCm) : '',
      fechaNacimiento: aTexto(new Date(data.fechaNacimiento)),
    });
    setSexo(data.sexo);
    setGrupoId(data.grupoId);
    setCargado(true);
  }, [data, cargado]);

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(`/pacientes/${id}`, {
        nombre: c.nombre.trim(),
        apellido: c.apellido.trim(),
        ...(c.documento.trim() ? { documento: c.documento.trim() } : {}),
        fechaNacimiento: validarFecha(c.fechaNacimiento).fecha!.toISOString(),
        sexo,
        ...(grupoId ? { grupoId } : {}),
        ...(c.alturaCm.trim() ? { alturaCm: Number(c.alturaCm) } : {}),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      await qc.invalidateQueries({ queryKey: ['cockpit', id] });
      router.back();
    },
  });

  const eliminar = useMutation({
    mutationFn: () => api.delete(`/pacientes/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      router.dismissAll();
      router.replace('/(tabs)');
    },
  });

  if (isLoading || !data) return <Cargando />;

  const campo = (k: keyof typeof c) => (v: string) => setC((p) => ({ ...p, [k]: v }));

  return (
    <Pantalla>
      <CampoTexto etiqueta="Nombre" value={c.nombre} onChangeText={campo('nombre')} />
      <CampoTexto etiqueta="Apellido" value={c.apellido} onChangeText={campo('apellido')} />
      <CampoTexto etiqueta="Documento" value={c.documento} onChangeText={campo('documento')} />
      <CampoFecha
        etiqueta="Fecha de nacimiento"
        valor={c.fechaNacimiento}
        onChange={campo('fechaNacimiento')}
      />
      <CampoTexto
        etiqueta="Altura (cm)"
        value={c.alturaCm}
        onChangeText={campo('alturaCm')}
        keyboardType="numeric"
      />

      <Eyebrow>Sexo</Eyebrow>
      <View className="mb-4 flex-row gap-2">
        {(['F', 'M', 'OTRO'] as const).map((s) => (
          <Chip key={s} texto={s} activo={sexo === s} onPress={() => setSexo(s)} />
        ))}
      </View>

      <Eyebrow>Grupo</Eyebrow>
      <View className="mb-4 flex-row flex-wrap gap-2">
        <Chip texto="Sin grupo" activo={grupoId === null} onPress={() => setGrupoId(null)} />
        {inicio?.grupos.map((g) => (
          <Chip key={g.id} texto={g.nombre} activo={grupoId === g.id} onPress={() => setGrupoId(g.id)} />
        ))}
      </View>

      <Text className="font-sans mb-4 px-1 text-meta text-ink-suave">
        El peso y la creatinina se editan desde Función renal.
      </Text>

      <Boton
        onPress={() => guardar.mutate()}
        cargando={guardar.isPending}
        deshabilitado={!validarFecha(c.fechaNacimiento).valida}
      >
        Guardar
      </Boton>

      <View className="mt-8" />
      <Eyebrow>Zona de riesgo</Eyebrow>
      <AvisoNeutro>
        Se borran también su tratamiento, condiciones y alergias. No se puede deshacer.
      </AvisoNeutro>
      <View className="mt-2">
        <Boton
          variante="destructivo"
          cargando={eliminar.isPending}
          onPress={() =>
            Alert.alert(
              'Eliminar paciente',
              `${data.nombre} ${data.apellido} y todos sus datos clínicos.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => eliminar.mutate() },
              ],
            )
          }
        >
          Eliminar paciente
        </Boton>
      </View>
    </Pantalla>
  );
}
