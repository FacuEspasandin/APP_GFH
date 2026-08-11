import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { hapticaExito } from '@/ui/haptica';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { AvisoNeutro, Boton, CampoTexto, Chip, Eyebrow, Pantalla } from '@/ui/kit';

const VIAS = ['ORAL', 'IV', 'SC', 'IM', 'TOPICA', 'INHALATORIA', 'SUBLINGUAL', 'RECTAL'] as const;
const ESTADOS = ['ACTIVO', 'SUSPENDIDO', 'FINALIZADO'] as const;

/**
 * Editar una prescripción.
 *
 * Suspender no borra: el fármaco deja de entrar a las verificaciones pero la
 * fila queda. Borrar es para lo que se cargó por error — un tratamiento que
 * terminó es historia clínica, no basura.
 */
export default function EditarPrescripcion() {
  const { id, paciente, nombre, dosis, frecuencia, via, estado } = useLocalSearchParams<{
    id: string;
    paciente?: string;
    nombre?: string;
    dosis?: string;
    frecuencia?: string;
    via?: string;
    estado?: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [f, setF] = useState({ dosis: dosis ?? '', frecuencia: frecuencia ?? '' });
  const [viaSel, setViaSel] = useState<string>(via ?? 'ORAL');
  const [estadoSel, setEstadoSel] = useState<string>(estado ?? 'ACTIVO');

  const invalidar = async () => {
    if (paciente) await qc.invalidateQueries({ queryKey: ['cockpit', paciente] });
    router.back();
  };

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(`/prescripciones/${id}`, {
        dosis: f.dosis.trim(),
        frecuencia: f.frecuencia.trim(),
        via: viaSel,
        estado: estadoSel,
      }),
    onSuccess: () => { hapticaExito(); return invalidar(); },
  });

  const eliminar = useMutation({
    mutationFn: () => api.delete(`/prescripciones/${id}`),
    onSuccess: () => { hapticaExito(); return invalidar(); },
  });

  return (
    <Pantalla>
      <BloqueFormulario titulo={nombre || 'Pauta'} exigencia="Obligatorio">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <CampoTexto
              etiqueta="Dosis"
              value={f.dosis}
              onChangeText={(v) => setF((p) => ({ ...p, dosis: v }))}
            />
          </View>
          <View className="flex-1">
            <CampoTexto
              etiqueta="Frecuencia"
              value={f.frecuencia}
              onChangeText={(v) => setF((p) => ({ ...p, frecuencia: v }))}
            />
          </View>
        </View>

        <Text className="mb-1.5 text-eyebrow font-medio uppercase tracking-wider text-ink-suave">
          Vía
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {VIAS.map((v) => (
            <Chip key={v} texto={v} activo={viaSel === v} onPress={() => setViaSel(v)} />
          ))}
        </View>
      </BloqueFormulario>

      <BloqueFormulario titulo="Estado">
        <View className="flex-row flex-wrap gap-2">
          {ESTADOS.map((e) => (
            <Chip key={e} texto={e} activo={estadoSel === e} onPress={() => setEstadoSel(e)} />
          ))}
        </View>
        {estadoSel !== 'ACTIVO' ? (
          <Text className="font-sans mt-2.5 text-meta leading-4 text-ink-suave">
            Deja de entrar a las verificaciones, pero queda registrado.
          </Text>
        ) : null}
      </BloqueFormulario>

      <Boton onPress={() => guardar.mutate()} cargando={guardar.isPending}>
        Guardar cambios
      </Boton>

      <View className="mt-8" />
      <Eyebrow>Zona de riesgo</Eyebrow>
      <AvisoNeutro>
        Borrar es para lo que se cargó por error. Si el tratamiento terminó, marcalo como finalizado.
      </AvisoNeutro>
      <View className="mt-2">
        <Boton
          variante="destructivo"
          cargando={eliminar.isPending}
          onPress={() =>
            Alert.alert('Borrar prescripción', 'No se puede deshacer.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Borrar', style: 'destructive', onPress: () => eliminar.mutate() },
            ])
          }
        >
          Borrar prescripción
        </Boton>
      </View>
    </Pantalla>
  );
}
