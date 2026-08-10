import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { AvisoNeutro, Card, Chip, Eyebrow, Pantalla } from '@/ui/kit';
import { useTema, type Tema } from '@/ui/tema';
import { useColores } from '@/ui/tema';

const ETIQUETA: Record<Tema, string> = { CLARO: 'Claro', OSCURO: 'Oscuro', SISTEMA: 'Sistema' };

/** Configuración (6.4 tema / 6.5 notificaciones). Se guarda en el servidor. */
export default function Configuracion() {
  const col = useColores();

  const { tema, cambiar, configuracion } = useTema();
  const qc = useQueryClient();
  const [umbral, setUmbral] = useState<number | null>(null);

  const push = configuracion?.notificacionesPush ?? true;
  const umbralActual = umbral ?? configuracion?.umbralAdultoMayor ?? 65;

  const guardar = (datos: Record<string, unknown>) => {
    void api
      .patch('/perfil/configuracion', datos)
      .then(() => qc.invalidateQueries({ queryKey: ['configuracion'] }));
  };

  return (
    <Pantalla>
      <Eyebrow>Tema</Eyebrow>
      <View className="mb-4 flex-row gap-2">
        {(['CLARO', 'OSCURO', 'SISTEMA'] as const).map((t) => (
          <Chip key={t} texto={ETIQUETA[t]} activo={tema === t} onPress={() => cambiar(t)} />
        ))}
      </View>

      <Eyebrow>Notificaciones</Eyebrow>
      <Card className="mb-4 flex-row items-center px-3.5 py-3">
        <Text className="font-sans flex-1 text-body text-ink">Notificaciones push</Text>
        <Switch
          value={push}
          onValueChange={(v) => guardar({ notificacionesPush: v })}
          trackColor={{ true: col.primary, false: col.line }}
          accessibilityLabel="Notificaciones push"
        />
      </Card>

      <Eyebrow>Adulto mayor</Eyebrow>
      <View className="mb-2 flex-row flex-wrap gap-2">
        {[60, 65, 70, 75, 80].map((n) => (
          <Chip
            key={n}
            texto={`${n} años`}
            activo={umbralActual === n}
            onPress={() => {
              setUmbral(n);
              guardar({ umbralAdultoMayor: n });
            }}
          />
        ))}
      </View>
      <AvisoNeutro>
        Desde esta edad se aplican las alertas de medicación inapropiada en el anciano. En geriatría
        todos los pacientes superan 65 y la alerta se vuelve ruido.
      </AvisoNeutro>
    </Pantalla>
  );
}
