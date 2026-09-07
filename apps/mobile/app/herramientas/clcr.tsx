import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { calcularClcrParaMolde, moldeClcr } from '@/dominio/molde-clcr';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { Superficie } from '@/ui/superficie';
import { gradoKdigo, KDIGO_DESCRIPCION, type Borrador, type GradoKdigo } from '@gfh/shared-types';

/**
 * Clearance de creatinina, sobre datos sueltos.
 *
 * Segunda calculadora dibujada desde el molde, después de Child-Pugh. Antes
 * eran 210 líneas de pantalla propia; ahora es una declaración
 * (`molde-clcr.ts`) más el renderizador genérico.
 *
 * Es LIBRE y no toca la red: Cockcroft-Gault es una fórmula publicada de
 * 1976, igual que Child-Pugh en `hepatico.tsx`. Cruzar el clearance contra el
 * catálogo —cuánto ajustar CADA fármaco— es otra herramienta y sí consume
 * suscripción: ver `renal.tsx`.
 *
 * El grado KDIGO viaja por `extra` y no por el molde: es una segunda escala,
 * con sus propios cortes (90/60/45/30/15), y fusionarla con los tramos del
 * anillo perdería una de las dos. Por eso la pantalla guarda su propio
 * borrador —además del que ya lleva `Calculadora` adentro— nada más que para
 * poder calcular el grado en cada cambio.
 */
export default function CalculadoraClcr() {
  const [borrador, setBorrador] = useState<Borrador>({});
  const molde = moldeClcr();

  const clcr = calcularClcrParaMolde(borrador, {}).valor?.valor ?? null;
  const grado = gradoKdigo(clcr);

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="calculadora" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Clearance de creatinina</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Cockcroft-Gault, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Calculadora
          molde={molde}
          calcular={calcularClcrParaMolde}
          onCambio={(b) => setBorrador(b)}
          extra={grado ? <FilaKdigo grado={grado} /> : null}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * El grado KDIGO, aparte del anillo y con su propia rotulación — para que no
 * se lea como una segunda opinión sobre el mismo número, sino como lo que es:
 * otra escala.
 */
function FilaKdigo({ grado }: { grado: GradoKdigo }) {
  return (
    <Superficie
      elevacion="plana"
      className="mb-3.5 flex-row items-center justify-between bg-primary-light px-3.5 py-3"
    >
      <View>
        <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-primary">
          Grado KDIGO
        </Text>
        <Text className="font-sans mt-0.5 text-meta text-ink-suave">{KDIGO_DESCRIPCION[grado]}</Text>
      </View>
      <Text className="font-mono-fuerte text-fila text-primary">{grado}</Text>
    </Superficie>
  );
}
