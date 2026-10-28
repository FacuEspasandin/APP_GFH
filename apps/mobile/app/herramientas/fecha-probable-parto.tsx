import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { fechaProbableDeParto, semanasDesdeFum } from '@/dominio/fecha-probable-parto';
import { CampoFecha } from '@/ui/campo-fecha';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';
import { aTexto, validarFecha } from '@/ui/fecha';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

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
  const col = useColores();
  const [fumTexto, setFumTexto] = useState('');
  const validacion = validarFecha(fumTexto);

  const fpp = validacion.valida && validacion.fecha ? fechaProbableDeParto(validacion.fecha) : null;
  const semanas = validacion.valida && validacion.fecha ? semanasDesdeFum(validacion.fecha, new Date()) : null;

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <EncabezadoHerramienta icono="calculadora" titulo="Fecha probable de parto">
        Regla de Naegele, sobre datos sueltos — no cruza el catálogo.
      </EncabezadoHerramienta>

      <View className="flex-1 px-margen">
        <CampoFecha etiqueta="Fecha de última menstruación (FUM)" valor={fumTexto} onChange={setFumTexto} />

        <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3.5">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-sans text-meta text-ink-suave">Fecha probable de parto</Text>
            <Text className="font-mono-fuerte text-grande text-ink">
              {fpp ? aTexto(fpp) : '—'}
            </Text>
          </View>
          <View className="mt-2 flex-row items-baseline justify-between border-t border-line pt-2">
            <Text className="font-sans text-meta text-ink-suave">Semanas de gestación hoy</Text>
            <Text className="font-mono-fuerte text-grande text-ink">
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

        <Superficie className="mb-3.5 px-4 py-3.5" style={{ borderLeftWidth: 3, borderLeftColor: col.tenue }}>
          <Text className="font-sans mb-1.5 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
            ⓘ Sobre esta herramienta
          </Text>
          <Text className="font-sans text-meta leading-5 text-ink-suave">
            La regla de Naegele (Franz Naegele, siglo XIX) suma 280 días a la última menstruación,
            asumiendo un ciclo de 28 días con ovulación en el día 14. Sigue siendo el método de
            referencia para estimar la fecha de parto sin ecografía.
          </Text>
        </Superficie>
      </View>
    </View>
  );
}
