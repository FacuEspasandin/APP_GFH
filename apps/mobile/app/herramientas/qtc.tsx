import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularQtcParaMolde, claveTramoQtc, moldeQtc } from '@/dominio/molde-qtc';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';
import { Superficie } from '@/ui/superficie';
import { COLOR_SEVERIDAD, type Borrador, type ClaveColorSeveridad, type Tramo } from '@gfh/shared-types';

/**
 * QTc corregido (Bazett y Fridericia), sobre datos sueltos.
 *
 * `ResultadoCifras` no clasifica por cifra, y acá cada una necesita su
 * propio badge según sexo — por eso la pantalla guarda su propio borrador y
 * arma los dos badges como `extra`, mismo patrón que Clcr arma el KDIGO
 * aparte del anillo.
 */
export default function Qtc() {
  const [borrador, setBorrador] = useState<Borrador>({});
  const molde = moldeQtc();

  const cifras = calcularQtcParaMolde(borrador, {});
  const bazett = cifras.bazettMs?.valor ?? null;
  const fridericia = cifras.fridericiaMs?.valor ?? null;
  const tramoBazett = claveTramoQtc(bazett, borrador.sexo);
  const tramoFridericia = claveTramoQtc(fridericia, borrador.sexo);

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="pulso" titulo="QTc corregido">
        Bazett y Fridericia, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora
          molde={molde}
          calcular={calcularQtcParaMolde}
          onCambio={(b) => setBorrador(b)}
          extra={
            bazett !== null && fridericia !== null ? (
              <View className="mb-3.5 flex-row gap-2.5">
                <BadgeTramo etiqueta="Bazett" tramo={tramoBazett} />
                <BadgeTramo etiqueta="Fridericia" tramo={tramoFridericia} />
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

function BadgeTramo({ etiqueta, tramo }: { etiqueta: string; tramo: Tramo | null }) {
  const color = tramo?.color
    ? tramo.color in COLOR_SEVERIDAD
      ? COLOR_SEVERIDAD[tramo.color as ClaveColorSeveridad]
      : tramo.color
    : COLOR_SEVERIDAD.neutro;

  return (
    <Superficie elevacion="plana" className="flex-1 items-center px-3 py-2.5" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
      <Text className="font-sans text-eyebrow uppercase tracking-wider text-ink-suave">{etiqueta}</Text>
      <Text className="mt-1 font-fuerte text-meta" style={{ color }}>
        {tramo?.rotulo ?? '—'}
      </Text>
    </Superficie>
  );
}
