import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { calcularGlasgowParaMolde, categoriaGlasgow, moldeGlasgow } from '@/dominio/molde-glasgow';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { Superficie } from '@/ui/superficie';
import { COLOR_SEVERIDAD, type Borrador } from '@gfh/shared-types';

/**
 * Escala de Glasgow (GCS), sobre datos sueltos.
 *
 * `resultado.tipo: 'cifras'` en vez de `'puntaje'`: con la verbal no
 * evaluable (intubado), el molde devuelve el total en `null` con el motivo
 * —«E4 M6, sin sumar un valor inventado»—, y eso ya lo pinta el
 * renderizador genérico. El badge Leve/Moderado/Severo sí es bespoke: sólo
 * tiene sentido con un total real, así que la pantalla lo calcula aparte y
 * lo omite cuando el resultado es parcial.
 */
export default function Glasgow() {
  const [borrador, setBorrador] = useState<Borrador>({});
  const molde = moldeGlasgow();

  const total = calcularGlasgowParaMolde(borrador, {}).total?.valor ?? null;
  const categoria = total !== null ? categoriaGlasgow(total) : null;

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="glasgow" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Escala de Glasgow</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Nivel de conciencia, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <Calculadora
        molde={molde}
        calcular={calcularGlasgowParaMolde}
        onCambio={(b) => setBorrador(b)}
        extra={
          categoria ? (
            <Superficie
              elevacion="plana"
              className="mb-3.5 items-center px-3.5 py-3"
              style={{ borderLeftWidth: 3, borderLeftColor: COLOR_SEVERIDAD[categoria.color as keyof typeof COLOR_SEVERIDAD] ?? COLOR_SEVERIDAD.neutro }}
            >
              <Text
                className="font-fuerte text-fila"
                style={{ color: COLOR_SEVERIDAD[categoria.color as keyof typeof COLOR_SEVERIDAD] ?? COLOR_SEVERIDAD.neutro }}
              >
                {categoria.rotulo}
              </Text>
            </Superficie>
          ) : null
        }
      />
    </View>
  );
}
