import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { FACTORES_MODIFICABLES_HAS_BLED, moldeHasBled } from '@/dominio/molde-has-bled';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { Superficie } from '@/ui/superficie';
import type { Borrador } from '@gfh/shared-types';

/**
 * HAS-BLED, sobre datos sueltos.
 *
 * Libre y sin red: son criterios publicados, no cruza el catálogo. Sin
 * `calcular`: el resultado es de tipo puntaje, autosumado de los puntos que
 * declara cada criterio.
 *
 * La lista de «factores a corregir» no sale del molde genérico —el puntaje
 * no sabe cuáles de sus campos son modificables—, así que la pantalla
 * guarda su propio borrador para armarla como `extra`, mismo patrón que
 * Clcr arma el badge de KDIGO aparte del anillo.
 */
export default function HasBled() {
  const [borrador, setBorrador] = useState<Borrador>({});
  const molde = moldeHasBled();

  const presentes = FACTORES_MODIFICABLES_HAS_BLED.filter((f) => borrador[f.clave] === 'si');
  const todoContestado = molde.campos.every((c) => borrador[c.clave] !== undefined);

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="sangrado" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">HAS-BLED</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Riesgo de sangrado mayor a 1 año, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <Calculadora
        molde={molde}
        onCambio={(b) => setBorrador(b)}
        extra={
          todoContestado && presentes.length > 0 ? <FactoresACorregir factores={presentes} /> : null
        }
      />
    </View>
  );
}

function FactoresACorregir({ factores }: { factores: readonly { clave: string; rotulo: string }[] }) {
  return (
    <Superficie elevacion="plana" className="mb-3.5 bg-primary-light px-3.5 py-3">
      <Text className="mb-1.5 font-fuerte text-eyebrow uppercase tracking-wider text-primary">
        A corregir
      </Text>
      {factores.map((f) => (
        <Text key={f.clave} className="font-sans text-meta leading-5 text-ink-suave">
          · {f.rotulo}
        </Text>
      ))}
    </Superficie>
  );
}
