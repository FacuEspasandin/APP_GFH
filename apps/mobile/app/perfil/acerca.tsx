import { Text, View } from 'react-native';

import { dondeCorre, versionApp } from '@/ui/dispositivo';
import { Eyebrow, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';

/** Acerca de GFH (6.13). */
export default function Acerca() {
  const donde = dondeCorre();

  return (
    <Pantalla>
      <View className="items-center py-6">
        <View className="h-20 w-20 items-center justify-center rounded-card bg-primary">
          <Text className="text-xl font-fuerte tracking-widest text-white">GFH</Text>
        </View>
        <Text className="mt-4 text-fila font-fuerte text-ink">Gestión Farmacológica Hospitalaria</Text>
        {/* La versión sale del paquete instalado y no de un texto acá: escrita
            a mano se quedaba en 0.0.1 para siempre. Son los mismos números que
            ve la tienda, así que un reporte se ata a un build exacto. */}
        <Text className="font-mono mt-1.5 text-meta text-ink-suave">{versionApp()}</Text>
        {donde ? <Text className="font-mono mt-0.5 text-eyebrow text-tenue">{donde}</Text> : null}
      </View>

      <Eyebrow>Contenido clínico</Eyebrow>
      <Superficie elevacion="plana" className="mb-2 px-3.5 py-3">
        <Text className="font-sans text-meta leading-5 text-ink">
          Las tablas de ajuste renal son transcripción de <Text className="font-medio">Nefrología al día</Text>,
          Sociedad Española de Nefrología (mayo 2025). Los textos de interacciones, alertas y
          alternativas son de redacción propia y están pendientes de validación profesional.
        </Text>
      </Superficie>

      <Superficie elevacion="plana" className="px-3.5 py-3">
        <Text className="font-sans text-meta leading-5 text-ink">
          Cero decisiones clínicas salen de un modelo de lenguaje. Severidad, ajuste de dosis e
          interacciones salen siempre de tablas y reglas deterministas.
        </Text>
      </Superficie>
    </Pantalla>
  );
}
