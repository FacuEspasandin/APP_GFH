import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import type { Cockpit } from '@/api/tipos';
import {
  calcularSiSePuede,
  leyendaDelCambio,
  procedenciaClcr,
} from '@/dominio/funcion-renal';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Cargando, Boton, CampoTexto, Chip } from '@/ui/kit';
import { useColores } from '@/ui/tema';
import {
  calcularClcr,
  claveColorPorClcr,
  COLOR_SEVERIDAD,
  DatoClinicoInvalido,
  type Sexo,
} from '@gfh/shared-types';

/**
 * Editar datos renales (3.1.3). Calculado o pisado a mano.
 *
 * Antes esta pantalla pedía peso y creatinina, avisaba que "se calcula por
 * Cockcroft-Gault" y no mostraba ni el Clcr vigente ni el que iba a quedar. El
 * médico sobrescribía a ciegas un número del que cuelga todo el ajuste renal
 * del paciente.
 */
export default function DatosRenales() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: cockpit, isLoading } = useQuery({
    queryKey: ['cockpit', pacienteId],
    queryFn: () => api.get<Cockpit>(`/pacientes/${pacienteId}/cockpit`),
    enabled: Boolean(pacienteId),
  });

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

  if (isLoading || !cockpit) return <Cargando />;

  const p = cockpit.paciente;

  // El valor que quedaría al guardar, con la MISMA función que corre el
  // backend: si difirieran, el número que el médico vio no sería el que manda.
  const nuevo =
    modo === 'manual'
      ? (num(clcr) ?? null)
      : calcularSiSePuede(p.edadAnios, num(pesoKg), num(creatinina), p.sexo as Sexo);

  const listo = modo === 'manual' ? num(clcr) !== undefined : nuevo !== null;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-4 pb-4 pt-3" keyboardShouldPersistTaps="handled">
        <BloqueFormulario titulo="Ahora" etiqueta={p.clcrMlMin !== null ? 'Vigente' : undefined}>
          <ClcrVigente paciente={p} />
        </BloqueFormulario>

        <BloqueFormulario titulo="Nuevo valor">
          <View className="mb-3.5 flex-row gap-2">
            <Chip texto="Calcular" activo={modo === 'calcular'} onPress={() => setModo('calcular')} />
            <Chip texto="Ingresarlo" activo={modo === 'manual'} onPress={() => setModo('manual')} />
          </View>

          {modo === 'calcular' ? (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <CampoTexto
                  etiqueta="Peso"
                  value={pesoKg}
                  onChangeText={setPesoKg}
                  keyboardType="numeric"
                  placeholder="kg"
                />
              </View>
              <View className="flex-1">
                <CampoTexto
                  etiqueta="Creatinina"
                  value={creatinina}
                  onChangeText={setCreatinina}
                  keyboardType="numeric"
                  placeholder="mg/dL"
                />
              </View>
            </View>
          ) : (
            <CampoTexto
              etiqueta="Clcr (mL/min)"
              value={clcr}
              onChangeText={setClcr}
              keyboardType="numeric"
            />
          )}

          <Delta antes={p.clcrMlMin} despues={nuevo} manual={modo === 'manual'} />
        </BloqueFormulario>
      </ScrollView>

      <View className="border-t border-line bg-surface px-4 py-3">
        {/* "Guardar y recalcular" y no "Guardar": esto vuelve a correr las cinco
            verificaciones del paciente, y el botón tiene que decirlo. */}
        <Boton onPress={() => guardar.mutate()} cargando={guardar.isPending} deshabilitado={!listo}>
          Guardar y recalcular
        </Boton>
      </View>
    </KeyboardAvoidingView>
  );
}

function ClcrVigente({ paciente }: { paciente: Cockpit['paciente'] }) {
  if (paciente.clcrMlMin === null) {
    return (
      <Text className="font-sans text-meta leading-5 text-ink-suave">
        El paciente no tiene Clcr cargado, así que el ajuste renal está en neutro para todo su
        tratamiento.
      </Text>
    );
  }

  const color = COLOR_SEVERIDAD[claveColorPorClcr(paciente.clcrMlMin)];

  return (
    <>
      <View className="flex-row items-baseline">
        <Text
          className="font-mono-fuerte mr-2.5"
          style={{ color, fontSize: 26, fontVariant: ['tabular-nums'] }}
        >
          {String(paciente.clcrMlMin).replace('.', ',')}
        </Text>
        <Text className="font-sans text-meta text-ink-suave">
          mL/min{paciente.gradoKdigo ? ` · KDIGO ${paciente.gradoKdigo}` : ''}
        </Text>
      </View>

      <Text className="font-sans mt-2 text-meta leading-4 text-ink-suave">
        {procedenciaClcr(paciente, comoFecha)}
      </Text>
    </>
  );
}

/** De dónde salió el número que se está por pisar. */
function procedencia(p: Cockpit['paciente']): string {
  const calculado = p.clcrOrigen === 'CALCULADO_COCKCROFT';
  const cuando = p.clcrMedidoAt
    ? new Date(p.clcrMedidoAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'long' })
    : null;

  if (!calculado) {
    return cuando ? `Ingresado a mano el ${cuando}.` : 'Ingresado a mano.';
  }

  const con = [
    p.pesoKg !== null ? `${p.pesoKg} kg` : null,
    p.creatininaMgDl !== null ? `creatinina ${String(p.creatininaMgDl).replace('.', ',')}` : null,
  ].filter(Boolean);

  return [
    cuando ? `Calculado el ${cuando} por Cockcroft-Gault` : 'Calculado por Cockcroft-Gault',
    con.length > 0 ? `, con ${con.join(' y ')}.` : '.',
  ].join('');
}

/**
 * De cuánto a cuánto.
 *
 * Ninguno de los dos números solo dice lo que importa: si el paciente cruza un
 * umbral de la tabla de ajuste o se queda donde estaba.
 */
function Delta({
  antes,
  despues,
  manual,
}: {
  antes: number | null;
  despues: number | null;
  manual: boolean;
}) {
  const col = useColores();
  if (despues === null) return null;

  const color = COLOR_SEVERIDAD[claveColorPorClcr(despues)];

  return (
    <View className="mt-3 flex-row items-center rounded-chip bg-primary-light px-3 py-2.5">
      {antes !== null ? (
        <>
          <Text
            className="font-mono text-fila text-tenue"
            style={{ textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] }}
          >
            {String(antes).replace('.', ',')}
          </Text>
          <Text className="font-sans mx-2 text-meta text-tenue">→</Text>
        </>
      ) : null}

      <Text
        className="font-mono-fuerte mr-3"
        style={{ color, fontSize: 22, fontVariant: ['tabular-nums'] }}
      >
        {String(despues).replace('.', ',')}
      </Text>

      <Text className="font-sans flex-1 text-eyebrow leading-4" style={{ color: col.inkSuave }}>
        {leyendaDelCambio(antes, despues, manual)}
      </Text>
    </View>
  );
}


/** El formato de fecha vive en la pantalla: es presentación, no dominio. */
function comoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'long' });
}
