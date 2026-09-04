import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { hapticaExito, hapticaSeleccion } from '@/ui/haptica';
import { Icono } from '@/ui/iconos';
import { Boton, CampoTexto, Chip } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { viaLegible } from '@gfh/shared-types';

const VIAS = ['ORAL', 'IV', 'SC', 'IM', 'TOPICA', 'INHALATORIA', 'SUBLINGUAL', 'RECTAL'] as const;
const ESTADOS = [
  { valor: 'ACTIVO', etiqueta: 'Activo' },
  { valor: 'SUSPENDIDO', etiqueta: 'Suspendido' },
  { valor: 'FINALIZADO', etiqueta: 'Finalizado' },
] as const;

const ROJO = '#BA1A1A';

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
  const col = useColores();

  const [f, setF] = useState({ dosis: dosis ?? '', frecuencia: frecuencia ?? '' });
  const [viaSel, setViaSel] = useState<string>(via ?? 'ORAL');
  const [estadoSel, setEstadoSel] = useState<string>(estado ?? 'ACTIVO');

  const invalidar = async () => {
    if (paciente) await qc.invalidateQueries({ queryKey: ['cockpit', paciente] });
    router.back();
  };

  const guardar = useMutation({
    mutationFn: () =>
      API.actualizarPrescripcion(id, {
        dosis: f.dosis.trim(),
        frecuencia: f.frecuencia.trim(),
        via: viaSel,
        estado: estadoSel,
      }),
    onSuccess: () => { hapticaExito(); return invalidar(); },
  });

  const eliminar = useMutation({
    mutationFn: () => API.borrarPrescripcion(id),
    onSuccess: () => { hapticaExito(); return invalidar(); },
  });

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Editar Prescripción" />
      <ScrollView contentContainerClassName="px-4 pb-8 pt-4" keyboardShouldPersistTaps="handled">
        <Superficie elevacion="plana" className="mb-6 border p-4" style={{ borderColor: col.line }}>
          <Text className="text-grande font-medio text-ink">{nombre || 'Pauta'}</Text>
          {f.dosis ? (
            <Text className="mt-0.5 font-sans text-body text-ink-suave">{f.dosis}</Text>
          ) : null}

          <View className="mt-3 flex-row flex-wrap gap-2">
            <View
              className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ backgroundColor: '#ECEEF3' }}
            >
              <Icono nombre="capsula" tamano={12} color="#191C20" />
              <Text
                className="font-fuerte text-eyebrow uppercase tracking-wider"
                style={{ color: '#191C20' }}
              >
                {viaLegible(viaSel) ?? 'Sin vía'}
              </Text>
            </View>
            {f.frecuencia ? (
              <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: '#ECEEF3' }}>
                <Text
                  className="font-fuerte text-eyebrow uppercase tracking-wider"
                  style={{ color: '#191C20' }}
                >
                  {f.frecuencia}
                </Text>
              </View>
            ) : null}
          </View>
        </Superficie>

        <Text className="mb-2 text-fila font-medio text-ink">Estado de la prescripción</Text>
        <View
          className="mb-2 flex-row rounded-lg border p-1"
          style={{ backgroundColor: '#F2F3F9', borderColor: '#BECABD' }}
        >
          {ESTADOS.map((e) => {
            const activo = estadoSel === e.valor;
            return (
              <Pressable
                key={e.valor}
                onPress={() => {
                  hapticaSeleccion();
                  setEstadoSel(e.valor);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
                className="flex-1 items-center rounded-md py-2"
                style={{ backgroundColor: activo ? '#005228' : 'transparent' }}
              >
                <Text
                  className={activo ? 'text-body font-medio' : 'font-sans text-body'}
                  style={{ color: activo ? '#FFFFFF' : '#3F4940' }}
                >
                  {e.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {estadoSel !== 'ACTIVO' ? (
          <Text className="mb-6 font-sans text-meta leading-4 text-ink-suave">
            Deja de entrar a las verificaciones, pero queda registrado.
          </Text>
        ) : (
          <View className="mb-6" />
        )}

        <Text className="mb-3 text-fila font-medio text-ink">Detalles</Text>
        <CampoBento etiqueta="Dosis">
          <CampoTexto
            value={f.dosis}
            onChangeText={(v) => setF((p) => ({ ...p, dosis: v }))}
            placeholder="5 mg"
          />
        </CampoBento>
        <CampoBento etiqueta="Frecuencia">
          <CampoTexto
            value={f.frecuencia}
            onChangeText={(v) => setF((p) => ({ ...p, frecuencia: v }))}
            placeholder="cada 8 horas"
          />
        </CampoBento>
        <CampoBento etiqueta="Vía de administración" ultimo>
          <View className="flex-row flex-wrap gap-2">
            {VIAS.map((v) => (
              <Chip key={v} texto={v} activo={viaSel === v} onPress={() => setViaSel(v)} />
            ))}
          </View>
        </CampoBento>

        <View className="mt-6">
          <Boton onPress={() => guardar.mutate()} cargando={guardar.isPending}>
            Guardar cambios
          </Boton>
        </View>

        <View className="mt-10 gap-3 border-t pt-6" style={{ borderColor: col.line }}>
          <Text className="text-center text-fila font-fuerte" style={{ color: ROJO }}>
            Zona de riesgo
          </Text>
          <Pressable
            onPress={() =>
              Alert.alert('Borrar prescripción', 'No se puede deshacer.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Borrar', style: 'destructive', onPress: () => eliminar.mutate() },
              ])
            }
            disabled={eliminar.isPending}
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-2 rounded-full py-3.5"
            style={{ borderWidth: 2, borderColor: ROJO, opacity: eliminar.isPending ? 0.6 : 1 }}
          >
            <Icono nombre="basura" tamano={16} color={ROJO} />
            <Text className="text-fila font-medio" style={{ color: ROJO }}>
              Borrar prescripción
            </Text>
          </Pressable>
          <Text className="text-center font-sans text-meta leading-5 text-ink-suave">
            Borrar es para lo que se cargó por error. Si el tratamiento terminó, marcalo como
            finalizado.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/** Una tarjeta bordeada por campo: la etiqueta en mayúsculas arriba, el control real abajo. */
function CampoBento({
  etiqueta,
  children,
  ultimo,
}: {
  etiqueta: string;
  children: ReactNode;
  ultimo?: boolean;
}) {
  const col = useColores();
  return (
    <Superficie
      elevacion="plana"
      className={`border p-4 ${ultimo ? '' : 'mb-3'}`}
      style={{ borderColor: col.line }}
    >
      <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
        {etiqueta}
      </Text>
      {children}
    </Superficie>
  );
}
