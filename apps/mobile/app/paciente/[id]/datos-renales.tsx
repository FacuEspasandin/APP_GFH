import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { api } from '@/api/cliente';
import { AvisoNeutro, Boton, CampoTexto, Chip, Eyebrow, Pantalla } from '@/ui/kit';

/** Editar datos renales (3.1.3). Calculado o pisado a mano. */
export default function DatosRenales() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [modo, setModo] = useState<'calcular' | 'manual'>('calcular');
  const [pesoKg, setPesoKg] = useState('');
  const [creatinina, setCreatinina] = useState('');
  const [clcr, setClcr] = useState('');

  const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(',', '.')));

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(`/pacientes/${pacienteId}/datos-renales`, {
        ...(modo === 'manual'
          ? { clcrMlMin: num(clcr) }
          : { pesoKg: num(pesoKg), creatininaMgDl: num(creatinina) }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      router.back();
    },
  });

  return (
    <Pantalla>
      <Eyebrow>Cómo cargar el Clcr</Eyebrow>
      <View className="mb-4 flex-row gap-2">
        <Chip texto="Calcular" activo={modo === 'calcular'} onPress={() => setModo('calcular')} />
        <Chip texto="Ingresarlo" activo={modo === 'manual'} onPress={() => setModo('manual')} />
      </View>

      {modo === 'calcular' ? (
        <>
          <CampoTexto etiqueta="Peso (kg)" value={pesoKg} onChangeText={setPesoKg} keyboardType="numeric" />
          <CampoTexto
            etiqueta="Creatinina (mg/dL)"
            value={creatinina}
            onChangeText={setCreatinina}
            keyboardType="numeric"
          />
          <AvisoNeutro>
            Se calcula por Cockcroft-Gault con la edad y el sexo del paciente.
          </AvisoNeutro>
        </>
      ) : (
        <>
          <CampoTexto etiqueta="Clcr (mL/min)" value={clcr} onChangeText={setClcr} keyboardType="numeric" />
          <AvisoNeutro>
            Pisa al calculado y queda marcado como ingresado a mano.
          </AvisoNeutro>
        </>
      )}

      <View className="mt-2">
        <Boton
          onPress={() => guardar.mutate()}
          cargando={guardar.isPending}
          deshabilitado={modo === 'manual' ? !clcr : !pesoKg || !creatinina}
        >
          Guardar
        </Boton>
      </View>
    </Pantalla>
  );
}
