import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { Icono } from '@/ui/iconos';
import { hapticaExito } from '@/ui/haptica';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Boton, CampoTexto, Chip } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

const VIAS = ['ORAL', 'IV', 'SC', 'IM', 'TOPICA', 'INHALATORIA', 'SUBLINGUAL', 'RECTAL'] as const;
const VERSION_DISCLAIMER = '1.0';

/**
 * Aceptar una alternativa (3.6.3).
 *
 * Reemplazar cambia la medicación: crea la prescripción de la alternativa y
 * SACA la que reemplaza, en una sola transacción. Si el médico cambió el
 * fármaco, el viejo no sigue en el tratamiento; para sumar sin sacar está
 * "Agregar fármaco", que es otra acción.
 *
 * Borrar la prescripción no pierde el rastro: la `AlternativaAceptada` guarda
 * qué reemplazó a qué, con quién y cuándo.
 *
 * La dosis se pide y no se sugiere: el catálogo no la tiene, y una dosis
 * inventada por el sistema es exactamente lo que la regla 1 prohíbe.
 *
 * El disclaimer con checkbox obligatorio vive acá — es el tercero de los cuatro
 * puntos de la regla 7.
 */
export default function AceptarAlternativa() {
  const col = useColores();

  const {
    id: pacienteId,
    paOrigenId,
    paAlternativaId,
    prescripcion,
    origen,
    alternativa,
  } = useLocalSearchParams<{
    id: string;
    paOrigenId: string;
    paAlternativaId: string;
    prescripcion?: string;
    origen?: string;
    alternativa?: string;
  }>();

  const router = useRouter();
  const qc = useQueryClient();

  const [f, setF] = useState({ dosis: '', frecuencia: '' });
  const [via, setVia] = useState<(typeof VIAS)[number]>('ORAL');
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aceptar = useMutation({
    mutationFn: () =>
      api.post(`/pacientes/${pacienteId}/alternativas-aceptadas`, {
        paOrigenId,
        paAlternativaId,
        ...(prescripcion ? { prescripcionOrigenId: prescripcion } : {}),
        disclaimerVersion: VERSION_DISCLAIMER,
        reemplazo: { dosis: f.dosis.trim(), frecuencia: f.frecuencia.trim(), via },
      }),
    onSuccess: async () => {
      hapticaExito();
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      await qc.invalidateQueries({ queryKey: ['alternativas', pacienteId] });
      // Vuelve al cockpit, no a la lista de alternativas: lo que cambió es el
      // tratamiento y ahí es donde se ve.
      router.dismissAll();
      router.replace(`/paciente/${pacienteId}` as never);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo aplicar el cambio.'),
  });

  const listo = f.dosis.trim().length > 0 && f.frecuencia.trim().length > 0 && confirmado;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-4 pb-4 pt-3" keyboardShouldPersistTaps="handled">
        {/* Sale → entra, en una línea. Dos renglones apilados no comunican que
            uno reemplaza al otro: parecían dos datos sueltos. */}
        <Superficie elevacion="plana" className="mb-3.5 flex-row items-center px-3.5 py-3.5">
          <View className="flex-1">
            <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-tenue">Sale</Text>
            <Text
              className="text-fila font-fuerte text-ink-suave"
              style={{ textDecorationLine: 'line-through' }}
              numberOfLines={1}
            >
              {origen ?? 'el fármaco actual'}
            </Text>
          </View>

          <Text className="mx-2 text-body text-tenue">→</Text>

          <View className="flex-1">
            <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-tenue">Entra</Text>
            <Text className="text-fila font-fuerte text-primary" numberOfLines={1}>
              {alternativa ?? 'la alternativa'}
            </Text>
          </View>
        </Superficie>

        <BloqueFormulario
          titulo={`Pauta de ${alternativa ?? 'la alternativa'}`}
          exigencia="Obligatorio"
        >
          <View className="flex-row gap-3">
            <View className="flex-1">
              <CampoTexto
                etiqueta="Dosis"
                value={f.dosis}
                onChangeText={(v) => setF((p) => ({ ...p, dosis: v }))}
                placeholder="500 mg"
              />
            </View>
            <View className="flex-1">
              <CampoTexto
                etiqueta="Frecuencia"
                value={f.frecuencia}
                onChangeText={(v) => setF((p) => ({ ...p, frecuencia: v }))}
                placeholder="cada 8 h"
              />
            </View>
          </View>

          <Text className="mb-1.5 text-eyebrow font-medio uppercase tracking-wider text-ink-suave">
            Vía
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {VIAS.map((v) => (
              <Chip key={v} texto={v} activo={via === v} onPress={() => setVia(v)} />
            ))}
          </View>

          {/* El aviso de la dosis va adentro del bloque que la pide, no suelto
              al final de la pantalla. */}
          <Text className="font-sans mt-3 text-meta leading-4 text-ink-suave">
            La dosis la ponés vos: el catálogo no la trae y el sistema no la inventa.
          </Text>
        </BloqueFormulario>

        {prescripcion ? (
          <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3">
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              {origen ?? 'El fármaco actual'} sale del tratamiento. Si querés sumar la alternativa
              sin sacarlo, usá «Agregar fármaco».
            </Text>
          </Superficie>
        ) : null}

        {error ? (
          <Text className="font-sans mb-1 px-1 text-meta" style={{ color: col.peligro }}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {/* El consentimiento y el botón, al pie: es el tercero de los cuatro
          puntos de la regla 7 y estaba a mitad del scroll, lejos de donde se
          decide. */}
      <View className="border-t border-line bg-surface px-4 py-3">
        <Pressable
          onPress={() => setConfirmado((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmado }}
          className="mb-3 flex-row items-start gap-3"
        >
          <View
            className="mt-0.5 h-5 w-5 items-center justify-center rounded-[5px] border-2"
            style={{
              borderColor: confirmado ? col.primary : col.tenue,
              backgroundColor: confirmado ? col.primary : 'transparent',
            }}
          >
            {confirmado ? <Icono nombre="check" tamano={14} color="#FFFFFF" /> : null}
          </View>
          <Text className="font-sans flex-1 text-meta leading-5 text-ink-suave">
            El cambio es una decisión mía. GFH muestra los problemas conocidos de cada opción, no
            decide cuál corresponde. Queda registrado con mi usuario.
          </Text>
        </Pressable>

        <Boton
          onPress={() => {
            setError(null);
            aceptar.mutate();
          }}
          cargando={aceptar.isPending}
          deshabilitado={!listo}
        >
          Aplicar cambio
        </Boton>
      </View>
    </KeyboardAvoidingView>
  );
}
