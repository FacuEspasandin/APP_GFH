import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import type { Inicio } from '@/api/tipos';
import * as API from '@/api/endpoints';
import { SkeletonFormulario } from '@/ui/estados-sistema';
import { CampoFecha } from '@/ui/campo-fecha';
import { aTexto, validarFecha } from '@/ui/fecha';
import { AvisoNeutro, Boton, CampoTexto, Chip, Eyebrow, Pantalla } from '@/ui/kit';
import { OPCIONES_SEXO, type Sexo } from '@gfh/shared-types';

/** Editar y eliminar paciente (2.9). */
export default function EditarPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['paciente', id],
    queryFn: () => API.paciente(id),
    enabled: Boolean(id),
  });
  const { data: inicio } = useQuery({ queryKey: ['inicio'], queryFn: API.inicio });

  const [c, setC] = useState({ nombre: '', apellido: '', documento: '', alturaCm: '', fechaNacimiento: '' });
  const [sexo, setSexo] = useState<Sexo>('F');
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
      API.actualizarPaciente(id, {
        nombre: c.nombre.trim(),
        apellido: c.apellido.trim(),
        ...(c.documento.trim() ? { documento: c.documento.trim() } : {}),
        fechaNacimiento: validarFecha(c.fechaNacimiento).fecha!.toISOString(),
        sexo,
        ...(grupoId ? { grupoId } : {}),
        // Con coma: el teclado numérico de un teléfono en español la ofrece, y
        // «1,70» sin esto sale NaN, viaja como `null` y el backend lo rechaza.
        // Crear paciente ya lo hacía; editar había quedado atrás.
        ...(c.alturaCm.trim() ? { alturaCm: Number(c.alturaCm.replace(',', '.')) } : {}),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      await qc.invalidateQueries({ queryKey: ['cockpit', id] });
      router.back();
    },
  });

  const eliminar = useMutation({
    mutationFn: () => API.borrarPaciente(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      // Borrar libera cupo del plan gratis: sin invalidar esto, "Nuevo
      // paciente" seguiría mandando al paywall con el conteo viejo.
      await qc.invalidateQueries({ queryKey: ['plan'] });
      router.dismissAll();
      router.replace('/(tabs)');
    },
  });

  if (isLoading || !data) return <SkeletonFormulario campos={5} />;

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
        {OPCIONES_SEXO.map((o) => (
          <Chip
            key={o.valor}
            texto={o.sigla}
            activo={sexo === o.valor}
            onPress={() => setSexo(o.valor)}
          />
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
