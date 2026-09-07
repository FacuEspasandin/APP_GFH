import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { calcularRiesgoCVParaMolde, moldeRiesgoCV } from '@/dominio/molde-riesgo-cv';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { Chip } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Las cuatro condiciones de la guía que hacen que NO corresponda calcular:
 * ya son, por definición, de riesgo alto. No es una lista completa de la
 * guía —esa trae más casos (DM de larga evolución, albuminuria)— sino las
 * que se pueden preguntar en una sola tarjeta sin convertir el filtro en
 * otra cascada de seis preguntas más.
 */
const EXCLUSIONES = [
  'Aterosclerosis clínica (infarto, ACV, enfermedad arterial periférica)',
  'Enfermedad renal crónica',
  'Colesterol LDL ≥ 190 mg/dl',
  'Hipercolesterolemia familiar documentada',
];

/**
 * Riesgo cardiovascular a 10 años, sobre datos sueltos.
 *
 * Libre y sin red, igual que Clcr y Child-Pugh: es una tabla publicada
 * (WHO/ISH, AMR B — la que cita la guía uruguaya de dislipemias), no algo
 * que cruce el catálogo. Todos los usuarios la ven, tengan suscripción o no.
 *
 * El filtro de exclusión (paso 1) vive AFUERA del molde: contestar «sí»
 * corta la cascada entera y muestra alto riesgo directo, sin pedir sexo,
 * edad ni el resto — el molde no tiene forma de saltarse sus propios
 * campos, y este corte es previo a la calculadora, no parte de ella.
 */
export default function RiesgoCardiovascular() {
  const col = useColores();
  const [excluido, setExcluido] = useState<boolean | null>(null);
  const molde = moldeRiesgoCV();

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <View className="px-4 pt-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Icono nombre="pulso" tamano={20} color="#B91C1C" />
          <Text className="text-[26px] font-fuerte text-ink">Riesgo cardiovascular</Text>
        </View>
        <Text className="mb-2 text-body leading-6 text-ink-suave">
          A 10 años, sobre datos sueltos — no cruza el catálogo.
        </Text>
      </View>

      <View className="px-4">
        {excluido !== null ? (
          <Pressable
            onPress={() => setExcluido(null)}
            accessibilityRole="button"
            accessibilityLabel="Corregir si tiene alguna de las condiciones"
            className="mb-2 flex-row items-center rounded-card border border-line bg-surface px-3.5 py-2.5"
          >
            <Icono nombre="check" tamano={14} color={col.primary} />
            <Text className="font-sans ml-2.5 flex-1 text-meta text-ink-suave" numberOfLines={1}>
              ¿Tiene alguna de estas condiciones?
            </Text>
            <Text className="text-meta font-medio text-ink">{excluido ? 'Sí' : 'No'}</Text>
            <Text className="ml-2 text-meta text-ink-suave">✎</Text>
          </Pressable>
        ) : (
          <Superficie
            elevacion="plana"
            className="mb-2.5 px-3.5 py-3.5"
            style={{ borderColor: col.primary, borderWidth: 1.5 }}
          >
            <Text className="text-grande font-fuerte text-ink">¿Tiene alguna de estas?</Text>
            <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">
              Si tiene alguna, no hace falta calcular: ya se considera alto riesgo.
            </Text>
            <View className="mt-2.5 gap-1">
              {EXCLUSIONES.map((e) => (
                <View key={e} className="flex-row items-start gap-2">
                  <Text style={{ color: col.tenue }}>·</Text>
                  <Text className="font-sans flex-1 text-meta leading-5 text-ink-suave">{e}</Text>
                </View>
              ))}
            </View>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Chip texto="No, ninguna" onPress={() => setExcluido(false)} />
              <Chip texto="Sí, tiene alguna" onPress={() => setExcluido(true)} />
            </View>
          </Superficie>
        )}

        {excluido === true ? (
          <Superficie
            elevacion="plana"
            className="items-center px-3.5 py-6"
            style={{ borderLeftWidth: 4, borderLeftColor: '#7C1D2C' }}
          >
            <Text className="font-mono-fuerte text-titulo" style={{ color: '#7C1D2C' }}>
              Alto riesgo
            </Text>
            <Text className="font-sans mt-2 text-center text-meta leading-5 text-ink-suave">
              La guía dice que a estos pacientes no se les aplica la tabla: ya se consideran de
              riesgo alto, sin necesidad de calcular el resto.
            </Text>
          </Superficie>
        ) : null}
      </View>

      {excluido === false ? <Calculadora molde={molde} calcular={calcularRiesgoCVParaMolde} /> : null}
    </View>
  );
}
