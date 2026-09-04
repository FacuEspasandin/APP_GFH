import { Text, View } from 'react-native';

import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { dondeCorre, versionApp } from '@/ui/dispositivo';
import { Eyebrow, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/** Acerca de GFH (6.13). */
export default function Acerca() {
  const col = useColores();
  const donde = dondeCorre();

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Acerca de GFH" />
      <Pantalla>
        <View className="items-center py-6">
          <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-primary-light">
            <Icono nombre="capsula" tamano={40} color={col.primary} />
          </View>
          <Text className="text-center text-[22px] font-fuerte text-ink">
            Gestión Farmacológica Hospitalaria
          </Text>
          <Text className="mt-1 text-center text-body text-ink-suave">Plataforma clínica</Text>

          {/* La versión sale del paquete instalado y no de un texto acá: escrita
              a mano se quedaba en 0.0.1 para siempre. Son los mismos números que
              ve la tienda, así que un reporte se ata a un build exacto. */}
          <Superficie
            elevacion="plana"
            className="mt-5 w-full flex-row items-center justify-between border p-4"
            style={{ borderColor: col.line }}
          >
            <View>
              <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
                Versión
              </Text>
              <Text className="font-mono mt-0.5 text-body text-ink">{versionApp()}</Text>
            </View>
            {donde ? <Text className="font-mono text-eyebrow text-tenue">{donde}</Text> : null}
          </Superficie>
        </View>

        <Superficie
          elevacion="plana"
          className="mb-3 flex-row gap-3 border p-4"
          style={{ borderColor: col.line }}
        >
          <Icono nombre="prohibido" tamano={20} color="#0EA5E9" />
          <View className="flex-1">
            <Text className="mb-1 text-body font-medio text-ink">Garantía Cero-IA</Text>
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              Cero decisiones clínicas salen de un modelo de lenguaje. Severidad, ajuste de dosis e
              interacciones salen siempre de tablas y reglas deterministas.
            </Text>
          </View>
        </Superficie>

        <Eyebrow>Contenido clínico</Eyebrow>
        <Superficie elevacion="plana" className="border p-4" style={{ borderColor: col.line }}>
          <Text className="font-sans text-meta leading-5 text-ink">
            Las tablas de ajuste renal son transcripción de{' '}
            <Text className="font-medio">Nefrología al día</Text>, Sociedad Española de Nefrología
            (mayo 2025). Los textos de interacciones, alertas y alternativas son de redacción propia
            y están pendientes de validación profesional.
          </Text>
        </Superficie>
      </Pantalla>
    </View>
  );
}
