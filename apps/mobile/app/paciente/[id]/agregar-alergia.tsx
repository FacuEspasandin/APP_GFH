import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { BuscadorPrincipioActivo, type PaSugerido } from '@/ui/buscador-pa';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Boton, CampoTexto, Chip, Pantalla } from '@/ui/kit';

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
      <BloqueFormulario titulo="A qué" exigencia="Obligatorio">
        <View className="mb-3.5 flex-row gap-2">
          <Chip
            texto="A un fármaco"
            activo={tipo === 'FARMACOLOGICA'}
            onPress={() => setTipo('FARMACOLOGICA')}
          />
          <Chip texto="Texto libre" activo={tipo === 'GENERAL'} onPress={() => setTipo('GENERAL')} />
        </View>

        {tipo === 'FARMACOLOGICA' ? (
          <BuscadorPrincipioActivo
            unico
            seleccionados={pa}
            onAgregar={(x) => setPa([x])}
            onQuitar={() => setPa([])}
          />
        ) : (
          <>
            <CampoTexto
              etiqueta="Alérgeno"
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="sulfas, látex, penicilina…"
              autoCapitalize="none"
            />
            <Text className="font-sans text-meta leading-4 text-ink-suave">
              Si coincide con una familia conocida, cruza con los fármacos. Si no, queda registrada
              igual pero no dispara alertas.
            </Text>
          </>
        )}
      </BloqueFormulario>

      <BloqueFormulario titulo="Severidad" exigencia="Obligatorio">
        <View className="flex-row gap-2">
          {(['LEVE', 'MODERADA', 'GRAVE'] as const).map((s) => (
            <Chip
              key={s}
              texto={s.charAt(0) + s.slice(1).toLowerCase()}
              activo={severidad === s}
              onPress={() => setSeveridad(s)}
            />
          ))}
        </View>

        {/* La consecuencia, con las mismas palabras que la lista del paciente:
            "impide prescribir" contra "pide confirmación". */}
        <Text className="font-sans mt-3 text-meta leading-5 text-ink-suave">
          {severidad === 'GRAVE' && tipo === 'FARMACOLOGICA'
            ? 'Va a impedir prescribir ese principio activo exacto. Los de la misma familia no se bloquean: piden confirmación.'
            : 'Va a pedir confirmación al prescribir algo relacionado, sin bloquearlo.'}
        </Text>
      </BloqueFormulario>

      <Boton onPress={() => agregar.mutate()} cargando={agregar.isPending} deshabilitado={!listo}>
        Agregar alergia
      </Boton>
    </Pantalla>
  );
}
