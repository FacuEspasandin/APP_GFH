import { useQueryClient } from '@tanstack/react-query';
import { Switch, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Pantalla } from '@/ui/kit';
import { useColores, useTema } from '@/ui/tema';

/** Notificaciones (6.5). Se guarda en el servidor, no en el teléfono. */
export default function Notificaciones() {
  const col = useColores();
  const { configuracion } = useTema();
  const qc = useQueryClient();

  const push = configuracion?.notificacionesPush ?? true;

  const guardar = (valor: boolean) => {
    void api
      .patch('/perfil/configuracion', { notificacionesPush: valor })
      .then(() => qc.invalidateQueries({ queryKey: ['configuracion'] }));
  };

  return (
    <Pantalla>
      <BloqueFormulario titulo="Notificaciones push">
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
      </BloqueFormulario>
    </Pantalla>
  );
}
