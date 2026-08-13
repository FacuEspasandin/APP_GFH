import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import {
  borradorDesde,
  cuerpoDeGuardado,
  evaluar,
  sePuedeGuardar,
  type Borrador,
} from '@/dominio/hepatico';
import { FormularioChildPugh, ResultadoChildPugh } from '@/ui/child-pugh';
import { Boton, Cargando } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';

/**
 * Lo que hace falta de `GET /pacientes/:id`. Los tres primeros son `Decimal` en
 * el esquema, y Prisma los serializa como string.
 */
interface PacienteHepatico {
  bilirrubinaMgDl: string | number | null;
  albuminaGDl: string | number | null;
  inr: string | number | null;
  ascitis: string | null;
  encefalopatia: string | null;
  childPughClase: string | null;
}

const aNumeros = (p: PacienteHepatico) => ({
  bilirrubinaMgDl: p.bilirrubinaMgDl === null ? null : Number(p.bilirrubinaMgDl),
  albuminaGDl: p.albuminaGDl === null ? null : Number(p.albuminaGDl),
  inr: p.inr === null ? null : Number(p.inr),
  ascitis: p.ascitis,
  encefalopatia: p.encefalopatia,
});

/**
 * Función hepática del paciente (3.1.4).
 *
 * Reemplaza la pantalla que sólo explicaba por qué no se podía evaluar. Ahora
 * calcula y guarda la clase de Child-Pugh, que es lo que va a consumir el
 * ajuste hepático el día que exista la tabla por fármaco.
 *
 * Esa tabla sigue sin existir, y la pantalla lo dice arriba del botón en vez de
 * esconderlo: guardar sirve igual —la clase es un dato del paciente— pero
 * prometer un ajuste que no va a aparecer sería mentir.
 */
export default function DatosHepaticos() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  // Se pide el paciente completo y no el cockpit: los cinco criterios son datos
  // crudos que el motor no necesita, y meterlos en el contexto clínico sería
  // ensuciar el puerto del dominio con algo que sólo usa esta pantalla.
  const { data: paciente, isLoading } = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => api.get<PacienteHepatico>(`/pacientes/${pacienteId}`),
    enabled: Boolean(pacienteId),
  });

  const [editado, setEditado] = useState<Borrador | null>(null);

  const guardar = useMutation({
    mutationFn: (b: Borrador) =>
      api.patch(`/pacientes/${pacienteId}/datos-hepaticos`, cuerpoDeGuardado(b)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      await qc.invalidateQueries({ queryKey: ['historial', pacienteId] });
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      router.back();
    },
  });

  if (isLoading || !paciente) return <Cargando />;

  // Lo guardado es el punto de partida; lo que el médico toca lo pisa.
  const borrador = editado ?? borradorDesde(aNumeros(paciente));
  const yaTenia = paciente.childPughClase !== null;
  const r = evaluar(borrador);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-4 pb-4 pt-3" keyboardShouldPersistTaps="handled">
        <FormularioChildPugh valor={borrador} onCambio={setEditado} />

        <ResultadoChildPugh valor={borrador} />

        <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3">
          <Text className="font-sans text-meta leading-5 text-ink-suave">
            {r.clase === null
              ? 'La clase se guarda cuando estén los cinco criterios. Mientras tanto, lo que cargues queda igual.'
              : 'La clase queda en el paciente. La tabla de ajuste por fármaco todavía no existe: cuando esté, se aplica sola sobre el tratamiento que ya cargaste.'}
          </Text>
        </Superficie>
      </ScrollView>

      <View className="border-t border-line bg-surface px-4 py-3">
        <Boton
          onPress={() => guardar.mutate(borrador)}
          cargando={guardar.isPending}
          deshabilitado={!sePuedeGuardar(borrador)}
        >
          {yaTenia ? 'Actualizar' : 'Guardar y recalcular'}
        </Boton>
      </View>
    </KeyboardAvoidingView>
  );
}
