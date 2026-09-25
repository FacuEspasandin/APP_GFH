import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { fechaProbableDeParto, semanasDesdeFum } from '@/dominio/fecha-probable-parto';
import { CampoFecha } from '@/ui/campo-fecha';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { aTexto, validarFecha } from '@/ui/fecha';
import { Icono } from '@/ui/iconos';
import { Superficie } from '@/ui/superficie';

/**
 * Fecha probable de parto (regla de Naegele), sobre datos sueltos.
 *
 * Sin molde a propósito: pide una fecha, y el molde genérico no tiene ese
 * tipo de campo — ver `fecha-probable-parto.ts`. Se construye a mano, con el
 * mismo look que las demás herramientas (encabezado, tarjeta de resultado,
 * límite, "no se guarda nada"), reusando `CampoFecha` que ya existe para
 * fecha de nacimiento.
 *
 * No toca la `semanaGestacion` del paciente: es una calculadora suelta,
 * descartable, igual que Clcr o Child-Pugh.
 */
export default function FechaProbableDeParto() {
  const [fumTexto, setFumTexto] = useState('');
  const validacion = validarFecha(fumTexto);

  const fpp = validacion.valida && validacion.fecha ? fechaProbableDeParto(validacion.fecha) : null;
  const semanas = validacion.valida && validacion.fecha ? semanasDesdeFum(validacion.fecha, new Date()) : null;

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="calculadora" tamano={20} color="#005228" />
          <Text className="text-[28px] font-fuerte text-ink">Fecha probable de parto</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          Regla de Naegele, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <View className="flex-1 px-4">
        <CampoFecha etiqueta="Fecha de última menstruación (FUM)" valor={fumTexto} onChange={setFumTexto} />

        <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3.5">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-sans text-meta text-ink-suave">Fecha probable de parto</Text>
            <Text className="font-mono-fuerte text-titulo text-ink">
              {fpp ? aTexto(fpp) : '—'}
            </Text>
          </View>
          <View className="mt-2 flex-row items-baseline justify-between border-t border-line pt-2">
            <Text className="font-sans text-meta text-ink-suave">Semanas de gestación hoy</Text>
            <Text className="font-mono-fuerte text-titulo text-ink">
              {semanas !== null ? `${semanas} sem` : '—'}
            </Text>
          </View>
          <Text className="font-sans mt-2.5 text-eyebrow text-ink-suave">FUM + 280 días (40 semanas)</Text>
        </Superficie>

        <Text className="font-sans mb-3.5 text-meta leading-5 text-ink-suave">
          No dice la edad gestacional real si el ciclo no es de 28 días o la ovulación no fue
          estándar — para eso corresponde una ecografía. No guarda nada: si la semana de
          gestación tiene que quedar en la ficha del paciente, se carga aparte, como ya funciona
          hoy.
        </Text>

        <View
          className="mb-3 rounded-card border border-line bg-surface px-4 py-3.5"
          style={{ borderLeftWidth: 3, borderLeftColor: '#8CA39A' }}
        >
          <Text className="font-sans mb-1.5 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
            ⓘ Sobre esta herramienta
          </Text>
          <Text className="font-sans text-meta leading-5 text-ink-suave">
            La regla de Naegele (Franz Naegele, siglo XIX) suma 280 días a la última menstruación,
            asumiendo un ciclo de 28 días con ovulación en el día 14. Sigue siendo el método de
            referencia para estimar la fecha de parto sin ecografía.
          </Text>
        </View>
      </View>
    </View>
  );
}
