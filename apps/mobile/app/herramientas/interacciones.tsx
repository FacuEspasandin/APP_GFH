import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { BuscadorPrincipioActivo, type PaSugerido } from '@/ui/buscador-pa';
import { AvisoNeutro, Boton, Card, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { COLOR_SEVERIDAD, RANGO_POR_SEVERIDAD_INTERACCION } from '@gfh/shared-types';

interface Resultado {
  farmacos: string[];
  totalPares: number;
  conInteraccion: number;
  pares: Array<{ a: string; b: string; severidad: 'INFORMATIVA' | 'ALTA' | 'CONTRAINDICADA'; texto: string }>;
}

/** Herramienta 1 (4.2 / 4.3): N fármacos, todos los pares. */
export default function HerramientaInteracciones() {
  const [seleccion, setSeleccion] = useState<PaSugerido[]>([]);

  const calcular = useMutation({
    mutationFn: () =>
      api.post<Resultado>('/herramientas/interacciones', {
        principioActivoIds: seleccion.map((s) => s.id),
      }),
  });

  return (
    <Pantalla>
      <BuscadorPrincipioActivo
        seleccionados={seleccion}
        onAgregar={(pa) => setSeleccion((s) => (s.some((x) => x.id === pa.id) ? s : [...s, pa]))}
        onQuitar={(id) => setSeleccion((s) => s.filter((x) => x.id !== id))}
      />

      <View className="mt-2">
        <Boton
          onPress={() => calcular.mutate()}
          cargando={calcular.isPending}
          deshabilitado={seleccion.length < 2}
        >
          {seleccion.length < 2 ? 'Agregá al menos 2 fármacos' : 'Analizar interacciones'}
        </Boton>
      </View>

      {calcular.data ? (
        <View className="mt-5">
          <Eyebrow>
            {calcular.data.conInteraccion} de {calcular.data.totalPares} pares con interacción
            conocida
          </Eyebrow>

          {calcular.data.pares.length === 0 ? (
            // "Sin interacciones conocidas" no es lo mismo que "es seguro": el
            // catálogo cubre lo que cubre.
            <AvisoNeutro>
              Sin interacciones conocidas entre estos fármacos. No descarta otras.
            </AvisoNeutro>
          ) : (
            calcular.data.pares.map((par, i) => {
              const rango = RANGO_POR_SEVERIDAD_INTERACCION[par.severidad];
              const color =
                rango <= 1 ? COLOR_SEVERIDAD.grave : rango === 2 ? COLOR_SEVERIDAD.media : COLOR_SEVERIDAD.neutro;
              return (
                <View key={i} className="mb-2 flex-row items-stretch overflow-hidden rounded-card border border-line bg-surface">
                  <View style={{ width: 4, backgroundColor: color }} />
                  <View className="flex-1 px-3.5 py-3">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="flex-1 text-body font-medio text-ink">
                        {par.a} + {par.b}
                      </Text>
                      <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${color}22` }}>
                        <Text className="text-eyebrow font-fuerte uppercase" style={{ color }}>
                          {par.severidad}
                        </Text>
                      </View>
                    </View>
                    <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">{par.texto}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : null}

      {calcular.isError ? (
        <Estado titulo="No se pudo calcular" detalle={String(calcular.error)} />
      ) : null}

      {!calcular.data && seleccion.length === 0 ? (
        <View className="mt-4">
          <Estado
            titulo="Buscá fármacos para empezar"
            detalle="Agregá dos o más y te mostramos todos los pares con interacción conocida y su severidad."
          />
        </View>
      ) : null}
    </Pantalla>
  );
}

export { Pressable };
