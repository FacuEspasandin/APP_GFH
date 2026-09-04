import { useQueryClient } from '@tanstack/react-query';
import * as API from '@/api/endpoints';
import { Switch, Text, View } from 'react-native';

import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores, useTema } from '@/ui/tema';

/** Notificaciones (6.5). Se guarda en el servidor, no en el teléfono. */
export default function Notificaciones() {
  const col = useColores();
  const { configuracion } = useTema();
  const qc = useQueryClient();

  const push = configuracion?.notificacionesPush ?? true;

  const guardar = (valor: boolean) => {
    void API.guardarConfiguracion({ notificacionesPush: valor })
      .then(() => qc.invalidateQueries({ queryKey: ['configuracion'] }));
  };

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Notificaciones" />
      <Pantalla>
        <Superficie elevacion="plana" className="border p-4" style={{ borderColor: col.line }}>
          <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            Notificaciones push
          </Text>
          <View className="flex-row items-center">
            <Text className="font-sans flex-1 text-body text-ink">Recibir avisos</Text>
            <Switch
              value={push}
              onValueChange={guardar}
              trackColor={{ true: col.primary, false: col.line }}
              accessibilityLabel="Notificaciones push"
            />
          </View>
          <Text className="font-sans mt-2 text-meta leading-4 text-ink-suave">
            Se guarda en tu cuenta, no en el teléfono: vale para todos los dispositivos donde entres.
          </Text>
        </Superficie>
      </Pantalla>
    </View>
  );
}
