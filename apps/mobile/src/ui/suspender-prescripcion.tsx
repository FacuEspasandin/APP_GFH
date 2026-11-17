import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import * as API from '@/api/endpoints';
import { invalidarPaciente } from '@/dominio/cockpit';
import { useAviso } from './aviso';
import { HojaInferior } from './hoja-inferior';
import { Boton } from './kit';

interface Pauta {
  id: string;
  nombre: string;
}

/**
 * Suspender una prescripción: confirmación, llamada y «Deshacer».
 *
 * La usan el cockpit (al deslizar la fila) y la pantalla del fármaco (botón
 * «Suspender»): una sola confirmación y un solo texto, en vez de dos copias.
 *
 * Suspender no borra: el fármaco deja de entrar a las verificaciones pero la
 * fila queda en el historial. Reactivar es la misma llamada con otro estado, y
 * es lo que hace «Deshacer». El gesto o el botón nunca ejecutan solos: abren la
 * hoja, y recién su botón suspende.
 *
 * `hoja` hay que dibujarla en la pantalla (como la de `useConsentimiento`).
 * `alSuspender` corre después de suspender, p. ej. para volver al cockpit.
 */
export function useSuspenderPrescripcion(
  pacienteId: string | undefined,
  opciones?: { alSuspender?: () => void },
) {
  const aviso = useAviso();
  const qc = useQueryClient();
  /** El fármaco que el médico pidió suspender y todavía no confirmó. */
  const [pendiente, setPendiente] = useState<Pauta | null>(null);

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'ACTIVO' | 'SUSPENDIDO'; nombre: string }) =>
      API.actualizarPrescripcion(id, { estado }),
    onSuccess: async (_r, { id, estado, nombre }) => {
      await invalidarPaciente(qc, pacienteId);
      if (estado === 'SUSPENDIDO') {
        aviso.avisar(`${nombre} suspendido`, 'exito', {
          etiqueta: 'Deshacer',
          onPress: () => cambiarEstado.mutate({ id, estado: 'ACTIVO', nombre }),
        });
        opciones?.alSuspender?.();
      } else {
        aviso.avisar(`${nombre} reactivado`, 'exito');
      }
    },
    onError: () => aviso.avisar('No se pudo cambiar el estado. Probá de nuevo.', 'error'),
  });

  const hoja = (
    <HojaInferior
      visible={pendiente !== null}
      onCerrar={() => setPendiente(null)}
      titulo="Suspender fármaco"
    >
      <Text className="mb-1.5 mt-1 text-fila font-fuerte text-ink">¿Suspender {pendiente?.nombre}?</Text>
      <Text className="font-sans mb-4 text-meta leading-5 text-ink-suave">
        Deja de entrar a las verificaciones de este paciente. Queda en el historial. Podés
        deshacerlo unos segundos.
      </Text>
      <Boton
        variante="destructivo"
        cargando={cambiarEstado.isPending}
        onPress={() => {
          if (!pendiente) return;
          cambiarEstado.mutate({ id: pendiente.id, estado: 'SUSPENDIDO', nombre: pendiente.nombre });
          setPendiente(null);
        }}
      >
        Suspender
      </Boton>
      <Pressable
        onPress={() => setPendiente(null)}
        accessibilityRole="button"
        className="min-h-11 items-center justify-center"
      >
        <Text className="font-medio text-meta text-ink-suave">Cancelar</Text>
      </Pressable>
    </HojaInferior>
  );

  return { pedir: setPendiente, hoja };
}
