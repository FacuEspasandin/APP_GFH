import { Text, View } from 'react-native';

import { Card, Eyebrow, Pantalla } from '@/ui/kit';

/** Acerca de GFH (6.13). */
export default function Acerca() {
  return (
    <Pantalla>
      <View className="items-center py-6">
        <View className="h-20 w-20 items-center justify-center rounded-card bg-primary">
          <Text className="text-xl font-fuerte tracking-widest text-white">GFH</Text>
        </View>
        <Text className="mt-4 text-fila font-fuerte text-ink">Gestión Farmacológica Hospitalaria</Text>
        <Text className="font-sans mt-1 text-meta text-ink-suave">Versión 0.0.1 · desarrollo</Text>
      </View>

      <Eyebrow>Contenido clínico</Eyebrow>
      <Card className="mb-2 px-3.5 py-3">
        <Text className="font-sans text-meta leading-5 text-ink">
          Las tablas de ajuste renal son transcripción de <Text className="font-medio">Nefrología al día</Text>,
          Sociedad Española de Nefrología (mayo 2025). Los textos de interacciones, alertas y
          alternativas son de redacción propia y están pendientes de validación profesional.
        </Text>
      </Card>

      <Card className="px-3.5 py-3">
        <Text className="font-sans text-meta leading-5 text-ink">
          Cero decisiones clínicas salen de un modelo de lenguaje. Severidad, ajuste de dosis e
          interacciones salen siempre de tablas y reglas deterministas.
        </Text>
      </Card>
    </Pantalla>
  );
}
