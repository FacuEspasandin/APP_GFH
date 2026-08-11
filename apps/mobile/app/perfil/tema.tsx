import { View } from 'react-native';

import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Chip, Pantalla } from '@/ui/kit';
import { useTema, type Tema } from '@/ui/tema';

const ETIQUETA: Record<Tema, string> = { CLARO: 'Claro', OSCURO: 'Oscuro', SISTEMA: 'Sistema' };

/**
 * Tema (6.4).
 *
 * Salió de "Tema y notificaciones", que era un cajón con tres cosas sin
 * relación entre sí. Acá cada preferencia tiene su pantalla y su explicación.
 */
export default function TemaPantalla() {
  const { tema, cambiar } = useTema();

  return (
    <Pantalla>
      <BloqueFormulario titulo="Apariencia">
        <View className="flex-row gap-2">
          {(['CLARO', 'OSCURO', 'SISTEMA'] as const).map((t) => (
            <Chip key={t} texto={ETIQUETA[t]} activo={tema === t} onPress={() => cambiar(t)} />
          ))}
        </View>
      </BloqueFormulario>
    </Pantalla>
  );
}
