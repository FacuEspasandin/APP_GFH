import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { AnilloClcr } from '@/ui/anillo-clcr';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { CampoTexto } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import {
  calcularClcr,
  DatoClinicoInvalido,
  evaluarValor,
  gradoKdigo,
  OPCIONES_SEXO,
  RANGOS,
  type Sexo,
} from '@gfh/shared-types';

/**
 * Clearance de creatinina, sobre datos sueltos.
 *
 * Es una de las dos herramientas libres. Cockcroft-Gault es una fórmula
 * publicada de 1976: cobrarla nos pondría a competir con cualquier calculadora
 * web y no defendería nada. Lo que sí es nuestro —cuánto ajustar CADA fármaco
 * para ese clearance— vive en la herramienta de ajuste renal, que sí es paga.
 *
 * No llama al backend: el cálculo es puro y vive en `@gfh/shared-types`, el
 * mismo módulo que corre el servidor. Pedirle a la red que divida dos números
 * agregaría una espera y un modo de fallo por nada, y encima dejaría la
 * calculadora inservible sin conexión.
 *
 * Sin botón y sin guardar: el resultado sale mientras se escribe y se pierde al
 * salir, igual que el resto de las herramientas sueltas (modelo §5).
 */
export default function CalculadoraClcr() {
  const col = useColores();
  const [d, setD] = useState({ edadAnios: '', pesoKg: '', creatininaMgDl: '' });
  const [sexo, setSexo] = useState<Sexo>('F');

  const clcr = calcular(d, sexo);
  const grado = gradoKdigo(clcr);

  /**
   * Cuál de los tres campos rompe la fórmula, si alguno.
   *
   * Antes, un valor fuera de rango hacía que `calcularClcr` tirara y la
   * pantalla devolviera `null` en silencio: el anillo quedaba vacío con el
   * mismo gris que «todavía no escribiste nada».
   */
  const rechazado = (
    [
      ['Edad', num(d.edadAnios), RANGOS.edadAnios],
      ['Peso', num(d.pesoKg), RANGOS.pesoKg],
      ['Creatinina', num(d.creatininaMgDl), RANGOS.creatininaMgDl],
    ] as const
  )
    .map(([nombre, valor, rango]) => {
      const v = evaluarValor(valor, rango);
      return v.estado === 'invalido' ? `${nombre}: ${v.mensaje}` : null;
    })
    .find(Boolean);

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="px-4 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-fila font-fuerte text-ink">
            Calculadora de Aclaramiento de Creatinina (Cockcroft-Gault)
          </Text>
          <Text className="mb-4 mt-1 font-sans text-meta leading-5 text-ink-suave">
            Ingrese los datos del paciente para estimar la TFG.
          </Text>

          <Superficie elevacion="media" className="mb-4 p-5">
            {/* Los tres en una fila, igual que en Crear paciente: son números
                cortos que alimentan una sola fórmula. */}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <CampoTexto
                  etiqueta="Edad"
                  value={d.edadAnios}
                  onChangeText={(v) => setD((p) => ({ ...p, edadAnios: v }))}
                  keyboardType="numeric"
                  placeholder="años"
                  rango={RANGOS.edadAnios}
                  valor={num(d.edadAnios)}
                />
              </View>
              <View className="flex-1">
                <CampoTexto
                  etiqueta="Peso"
                  value={d.pesoKg}
                  onChangeText={(v) => setD((p) => ({ ...p, pesoKg: v }))}
                  keyboardType="numeric"
                  placeholder="kg"
                  rango={RANGOS.pesoKg}
                  valor={num(d.pesoKg)}
                />
              </View>
              <View className="flex-1">
                <CampoTexto
                  etiqueta="Creatinina"
                  value={d.creatininaMgDl}
                  onChangeText={(v) => setD((p) => ({ ...p, creatininaMgDl: v }))}
                  keyboardType="numeric"
                  placeholder="mg/dL"
                  rango={RANGOS.creatininaMgDl}
                  valor={num(d.creatininaMgDl)}
                />
              </View>
            </View>

            <Text className="mb-2 mt-1 font-fuerte text-[11px] uppercase tracking-wider text-ink-suave">
              Sexo biológico
            </Text>
            <View className="flex-row gap-2">
              {OPCIONES_SEXO.map((o) => {
                const activo = sexo === o.valor;
                return (
                  <Pressable
                    key={o.valor}
                    onPress={() => setSexo(o.valor)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo }}
                    className="flex-1 items-center rounded-full border py-2.5"
                    style={{
                      backgroundColor: activo ? '#005228' : col.surface,
                      borderColor: activo ? '#005228' : col.line,
                    }}
                  >
                    <Text
                      className="text-body"
                      style={{ color: activo ? '#FFFFFF' : col.ink }}
                    >
                      {o.sigla}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Superficie>

          {/* El anillo aparece siempre, vacío mientras faltan datos. Que el
              resultado se materialice recién al completar los campos deja al
              médico escribiendo a ciegas sin saber cuánto falta. */}
          <Superficie elevacion="media" className="mb-3.5 items-center px-3.5 py-6">
            <AnilloClcr clcrMlMin={clcr} gradoKdigo={grado} tamano={160} />
            <Text className="font-sans mt-3 text-center text-meta leading-5 text-ink-suave">
              {clcr !== null
                ? sexo === 'F'
                  ? 'Cockcroft-Gault, con el factor 0,85 por sexo.'
                  : 'Cockcroft-Gault.'
                : /* Un valor rechazado y un campo vacío daban el mismo anillo
                     gris. Ahora se distinguen: uno lo resuelve escribiendo, el
                     otro corrigiendo. */
                  (rechazado ??
                  'Completá edad, peso y creatinina para calcular.')}
            </Text>
          </Superficie>

          {/* Regla 5: sin dato no se insinúa nada. Y con dato tampoco se
              insinúa que el ajuste esté hecho — el clearance es el insumo, no
              la respuesta. */}
          <Superficie elevacion="plana" className="px-3.5 py-3">
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              {clcr === null
                ? 'La fórmula estima el filtrado a partir de la creatinina en sangre. No reemplaza un clearance medido.'
                : 'Este número no dice cuánto ajustar cada fármaco. Para eso hace falta cruzarlo contra las tablas del catálogo, que es lo que hace GFH con un paciente cargado.'}
            </Text>
          </Superficie>

          <Text className="font-sans mt-3 px-1 text-eyebrow leading-4 text-ink-suave">
            No se guarda nada. Al salir de la herramienta, estos valores se pierden.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Vacío o texto que no es número es «sin cargar», no cero. */
function num(v: string): number | undefined {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? undefined : n;
}

function calcular(
  d: { edadAnios: string; pesoKg: string; creatininaMgDl: string },
  sexo: Sexo,
): number | null {
  const edadAnios = num(d.edadAnios);
  const pesoKg = num(d.pesoKg);
  const creatininaMgDl = num(d.creatininaMgDl);
  if (edadAnios === undefined || pesoKg === undefined || creatininaMgDl === undefined) return null;

  try {
    return calcularClcr({ edadAnios, pesoKg, creatininaMgDl, sexo });
  } catch (e) {
    // Un cero o un negativo mientras se tipea no es un error que mostrar: es
    // un campo a medio escribir.
    if (e instanceof DatoClinicoInvalido) return null;
    throw e;
  }
}
