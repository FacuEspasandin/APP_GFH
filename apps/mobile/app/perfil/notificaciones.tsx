import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, Switch, Text, View } from 'react-native';

import {
  activarNotificaciones,
  desregistrarPushToken,
  permisoDeNotificaciones,
} from '@/api/notificaciones';
import * as API from '@/api/endpoints';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores, useTema } from '@/ui/tema';

/**
 * Notificaciones (6.5).
 *
 * El interruptor es un SÍ explícito, no una preferencia que arranca prendida.
 * Los avisos de GFH incluyen recordatorios de uso, que cuentan como
 * promocionales, y Apple (guideline 4.5.4) exige que se acepten con el texto
 * delante y que se puedan apagar desde la app. Por eso:
 *
 *   · Prender abre el diálogo del sistema, acá y no antes. La app ya no lo
 *     pide sola al arrancar.
 *   · Lo que se activa está escrito arriba del interruptor.
 *   · «Activadas» sólo se muestra si el teléfono también dio permiso: el
 *     interruptor de la cuenta solo no alcanza para que llegue nada.
 *
 * La preferencia se guarda en la cuenta, no en el teléfono; el permiso del
 * sistema sí es del teléfono.
 */
export default function Notificaciones() {
  const col = useColores();
  const { configuracion } = useTema();
  const qc = useQueryClient();

  const [permiso, setPermiso] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leerPermiso = useCallback(() => {
    void permisoDeNotificaciones().then(setPermiso, () => setPermiso(false));
  }, []);

  // Volver de Ajustes del teléfono tiene que reflejar el cambio sin reabrir.
  useEffect(() => {
    leerPermiso();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') leerPermiso();
    });
    return () => sub.remove();
  }, [leerPermiso]);

  const activas = (configuracion?.notificacionesPush ?? false) && permiso === true;

  const guardar = async (valor: boolean) => {
    await API.guardarConfiguracion({ notificacionesPush: valor });
    await qc.invalidateQueries({ queryKey: ['configuracion'] });
  };

  const alCambiar = async (valor: boolean) => {
    setError(null);
    try {
      if (!valor) {
        await guardar(false);
        await desregistrarPushToken();
        return;
      }
      const concedido = await activarNotificaciones();
      setPermiso(concedido);
      if (!concedido) {
        setError('El teléfono no dio permiso. Podés activarlo desde Ajustes.');
        return;
      }
      await guardar(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el cambio.');
    }
  };

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Notificaciones" />
      <Pantalla>
        <Superficie elevacion="plana" className="mb-3.5 p-4">
          <Text className="mb-1.5 text-body font-fuerte text-ink">Qué vas a recibir</Text>
          <Text className="font-sans text-meta leading-5 text-ink">
            Avisos de tu cuenta y tu suscripción (por ejemplo, un cambio de contraseña, una prueba
            que termina o una baja de cuenta) y recordatorios de uso de GFH. Nunca llevan datos de
            un paciente.
          </Text>
        </Superficie>

        <Superficie elevacion="plana" className="p-4">
          <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            Notificaciones push
          </Text>
          <View className="flex-row items-center">
            <Text className="font-sans flex-1 text-body text-ink">Recibir avisos</Text>
            <Switch
              value={activas}
              onValueChange={(v) => void alCambiar(v)}
              trackColor={{ true: col.primary, false: col.line }}
              accessibilityLabel="Notificaciones push"
            />
          </View>
          <Text className="font-sans mt-2 text-meta leading-4 text-ink-suave">
            Al activarlas aceptás recibirlas. Podés apagarlas cuando quieras: acá, o desde Ajustes
            del teléfono. La preferencia se guarda en tu cuenta y vale para todos tus dispositivos;
            el permiso del sistema es de cada teléfono.
          </Text>

          {error ? (
            <Text className="font-sans mt-2 text-meta" style={{ color: col.peligro }}>
              {error}
            </Text>
          ) : null}

          {permiso === false ? (
            <Pressable
              onPress={() => void Linking.openSettings()}
              accessibilityRole="button"
              className="mt-3 self-start py-1"
            >
              <Text className="font-medio text-meta text-accent">Abrir Ajustes del teléfono</Text>
            </Pressable>
          ) : null}
        </Superficie>
      </Pantalla>
    </View>
  );
}
