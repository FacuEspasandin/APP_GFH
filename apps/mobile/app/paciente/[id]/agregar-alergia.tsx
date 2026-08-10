import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { api } from '@/api/cliente';
import { BuscadorPrincipioActivo, type PaSugerido } from '@/ui/buscador-pa';
import { AvisoNeutro, Boton, CampoTexto, Chip, Eyebrow, Pantalla } from '@/ui/kit';

/** Agregar alergia (3.4.2 farmacológica / 3.4.3 texto libre). */
export default function AgregarAlergia() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [tipo, setTipo] = useState<'FARMACOLOGICA' | 'GENERAL'>('FARMACOLOGICA');
  const [pa, setPa] = useState<PaSugerido[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [severidad, setSeveridad] = useState<'LEVE' | 'MODERADA' | 'GRAVE'>('MODERADA');

  const agregar = useMutation({
    mutationFn: () =>
      api.post(`/pacientes/${pacienteId}/alergias`, {
        tipo,
        severidad,
        ...(tipo === 'FARMACOLOGICA' ? { principioActivoId: pa[0]?.id } : { descripcion: descripcion.trim() }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      router.back();
    },
  });

  const listo = tipo === 'FARMACOLOGICA' ? pa.length > 0 : descripcion.trim().length >= 2;

  return (
    <Pantalla>
      <View className="mb-4 flex-row gap-2">
        <Chip texto="A un fármaco" activo={tipo === 'FARMACOLOGICA'} onPress={() => setTipo('FARMACOLOGICA')} />
        <Chip texto="Texto libre" activo={tipo === 'GENERAL'} onPress={() => setTipo('GENERAL')} />
      </View>

      {tipo === 'FARMACOLOGICA' ? (
        <BuscadorPrincipioActivo unico seleccionados={pa} onAgregar={(x) => setPa([x])} onQuitar={() => setPa([])} />
      ) : (
        <>
          <CampoTexto
            etiqueta="Alérgeno"
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="sulfas, látex, penicilina…"
            autoCapitalize="none"
          />
          <AvisoNeutro>
            Si coincide con una familia conocida, cruza con los fármacos. Si no, queda registrada
            igual.
          </AvisoNeutro>
        </>
      )}

      <Eyebrow>Severidad</Eyebrow>
      <View className="mb-4 flex-row gap-2">
        {(['LEVE', 'MODERADA', 'GRAVE'] as const).map((s) => (
          <Chip key={s} texto={s} activo={severidad === s} onPress={() => setSeveridad(s)} />
        ))}
      </View>

      {severidad === 'GRAVE' && tipo === 'FARMACOLOGICA' ? (
        <AvisoNeutro>
          Una alergia grave a un fármaco concreto va a impedir prescribir ese principio activo. El
          cruce con otros de la misma familia no bloquea: avisa y pide confirmación.
        </AvisoNeutro>
      ) : null}

      <View className="mt-2">
        <Boton onPress={() => agregar.mutate()} cargando={agregar.isPending} deshabilitado={!listo}>
          Agregar alergia
        </Boton>
      </View>
    </Pantalla>
  );
}
