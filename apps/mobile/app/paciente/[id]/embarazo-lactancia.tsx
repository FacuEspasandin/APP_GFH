import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { Cockpit } from '@/api/tipos';
import {
  cuerpoDeGuardado,
  estadoEmbarazo,
  estadoLactancia,
  nombreTrimestre,
  semanaValida,
  sePuedeGuardar,
  type EstadoEmbarazo,
  type EstadoLactancia,
} from '@/dominio/gestacion';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Boton, CampoTexto, Cargando, Chip } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';

/**
 * Embarazo y lactancia (motor §6.2 y el addendum de la quinta verificación).
 *
 * El motor las evaluaba y el backend las guardaba desde siempre; lo que no
 * había era pantalla. Sin ella, 81 alertas de embarazo se aplicaban todas —38
 * llevan rango de semanas y no se podían afinar— y las 10 de lactancia nunca
 * se disparaban.
 */
export default function EmbarazoYLactancia() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: cockpit, isLoading } = useQuery({
    queryKey: ['cockpit', pacienteId],
    queryFn: () => api.get<Cockpit>(`/pacientes/${pacienteId}/cockpit`),
    enabled: Boolean(pacienteId),
  });

  const [embarazo, setEmbarazo] = useState<EstadoEmbarazo | null>(null);
  const [semana, setSemana] = useState<string | null>(null);
  const [lactancia, setLactancia] = useState<EstadoLactancia | null>(null);

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(
        `/pacientes/${pacienteId}`,
        cuerpoDeGuardado(embarazoActual, numeroSemana, lactanciaActual),
      ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      router.back();
    },
  });

  if (isLoading || !cockpit) return <Cargando />;

  const p = cockpit.paciente;

  // El estado guardado es el punto de partida; lo que el médico toca lo pisa.
  const embarazoActual = embarazo ?? estadoEmbarazo(p.semanaGestacion);
  const lactanciaActual = lactancia ?? estadoLactancia(p.estaLactando);
  const textoSemana = semana ?? (p.semanaGestacion === null ? '' : String(p.semanaGestacion));
  const numeroSemana = textoSemana.trim() === '' ? undefined : Number(textoSemana);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-4 pb-4 pt-3" keyboardShouldPersistTaps="handled">
        <BloqueFormulario
          titulo="Embarazo"
          etiqueta={embarazoActual === 'si' ? 'Cargado' : 'Sin dato'}
        >
          <View className="flex-row gap-2">
            <Chip
              texto="Sin dato"
              activo={embarazoActual === 'sin-dato'}
              onPress={() => setEmbarazo('sin-dato')}
            />
            <Chip texto="Sí" activo={embarazoActual === 'si'} onPress={() => setEmbarazo('si')} />
          </View>

          {embarazoActual === 'si' ? (
            <View className="mt-3.5">
              <CampoTexto
                etiqueta="Semanas de gestación"
                value={textoSemana}
                onChangeText={setSemana}
                keyboardType="numeric"
                placeholder="entre 1 y 45"
              />
              <Efecto semana={numeroSemana} />
            </View>
          ) : (
            <Text className="font-sans mt-3 text-meta leading-5 text-ink-suave">
              {/* Regla 5: el sistema no puede guardar "no está embarazada", y
                  decirlo es mejor que fingir un botón que guardaría lo mismo. */}
              Sin dato no es lo mismo que «no»: el sistema sólo registra la
              semana cuando la hay, y sin ella no evalúa embarazo.
            </Text>
          )}
        </BloqueFormulario>

        <BloqueFormulario
          titulo="Lactancia"
          etiqueta={lactanciaActual === 'sin-dato' ? 'Sin dato' : 'Cargado'}
        >
          <View className="flex-row gap-2">
            <Chip
              texto="Sin dato"
              activo={lactanciaActual === 'sin-dato'}
              onPress={() => setLactancia('sin-dato')}
            />
            <Chip texto="No" activo={lactanciaActual === 'no'} onPress={() => setLactancia('no')} />
            <Chip texto="Sí" activo={lactanciaActual === 'si'} onPress={() => setLactancia('si')} />
          </View>
          <Text className="font-sans mt-3 text-meta leading-5 text-ink-suave">
            Acá sí se puede registrar el «no»: queda guardado que se preguntó.
          </Text>
        </BloqueFormulario>

        <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3">
          <Text className="font-sans text-meta leading-5 text-ink-suave">
            Con la semana cargada, «Embarazo» aparece como condición del paciente sin que haya que
            cargarla a mano.
          </Text>
        </Superficie>
      </ScrollView>

      <View className="border-t border-line bg-surface px-4 py-3">
        <Boton
          onPress={() => guardar.mutate()}
          cargando={guardar.isPending}
          deshabilitado={!sePuedeGuardar(embarazoActual, numeroSemana)}
        >
          Guardar y recalcular
        </Boton>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Qué cambia la semana, en el mismo lugar donde se escribe.
 *
 * El trimestre ubica al médico; el efecto real lo decide el motor con los
 * rangos de cada alerta, y por eso acá no se promete un número.
 */
function Efecto({ semana }: { semana: number | undefined }) {
  if (!semanaValida(semana)) return null;

  return (
    <View className="mt-1 flex-row items-center rounded-chip bg-primary-light px-3 py-2.5">
      <Text
        className="font-mono-fuerte mr-3 text-primary"
        style={{ fontSize: 22, fontVariant: ['tabular-nums'] }}
      >
        {semana}
      </Text>
      <Text className="font-sans flex-1 text-eyebrow leading-4 text-ink-suave">
        <Text className="font-medio text-ink">{nombreTrimestre(semana!)}.</Text> Las alertas que
        dependen de la semana se afinan; las que no tienen rango se mantienen.
      </Text>
    </View>
  );
}
