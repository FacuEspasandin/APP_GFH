import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { AnilloClcr } from '@/ui/anillo-clcr';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { CampoTexto, Chip } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import {
  calcularClcr,
  DatoClinicoInvalido,
  gradoKdigo,
  OPCIONES_SEXO,
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
  const [d, setD] = useState({ edadAnios: '', pesoKg: '', creatininaMgDl: '' });
  const [sexo, setSexo] = useState<Sexo>('F');

  const clcr = calcular(d, sexo);
  const grado = gradoKdigo(clcr);

  return (
    <>
      <Stack.Screen options={{ title: 'Clearance de creatinina' }} />
      <KeyboardAvoidingView
        className="flex-1 bg-paper"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="px-4 pb-8 pt-3"
          keyboardShouldPersistTaps="handled"
        >
          <BloqueFormulario titulo="Datos del paciente" exigencia="Obligatorio">
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
                />
              </View>
              <View className="flex-1">
                <CampoTexto
                  etiqueta="Peso"
                  value={d.pesoKg}
                  onChangeText={(v) => setD((p) => ({ ...p, pesoKg: v }))}
                  keyboardType="numeric"
                  placeholder="kg"
                />
              </View>
              <View className="flex-1">
                <CampoTexto
                  etiqueta="Creatinina"
                  value={d.creatininaMgDl}
                  onChangeText={(v) => setD((p) => ({ ...p, creatininaMgDl: v }))}
                  keyboardType="numeric"
                  placeholder="mg/dL"
                />
              </View>
            </View>

            <Text className="mb-1.5 text-eyebrow font-medio uppercase tracking-wider text-ink-suave">
              Sexo
            </Text>
            <View className="flex-row gap-2">
              {OPCIONES_SEXO.map((o) => (
                <Chip
                  key={o.valor}
                  texto={o.sigla}
                  activo={sexo === o.valor}
                  onPress={() => setSexo(o.valor)}
                />
              ))}
            </View>
          </BloqueFormulario>

          {/* El anillo aparece siempre, vacío mientras faltan datos. Que el
              resultado se materialice recién al completar los campos deja al
              médico escribiendo a ciegas sin saber cuánto falta. */}
          <Superficie elevacion="plana" className="mb-3.5 items-center px-3.5 py-4">
            <AnilloClcr clcrMlMin={clcr} gradoKdigo={grado} tamano={132} />
            <Text className="font-sans mt-2.5 text-center text-meta leading-5 text-ink-suave">
              {clcr === null
                ? 'Completá edad, peso y creatinina para calcular.'
                : sexo === 'F'
                  ? 'Cockcroft-Gault, con el factor 0,85 por sexo.'
                  : 'Cockcroft-Gault.'}
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
    </>
  );
}

/** `null` mientras falte cualquiera de los tres, o si alguno no es un número
 *  que la fórmula acepte. Nunca un cero que se leería como resultado. */
function calcular(
  d: { edadAnios: string; pesoKg: string; creatininaMgDl: string },
  sexo: Sexo,
): number | null {
  const num = (v: string) => {
    const n = Number(v.replace(',', '.'));
    return v.trim() === '' || Number.isNaN(n) ? null : n;
  };

  const edadAnios = num(d.edadAnios);
  const pesoKg = num(d.pesoKg);
  const creatininaMgDl = num(d.creatininaMgDl);
  if (edadAnios === null || pesoKg === null || creatininaMgDl === null) return null;

  try {
    return calcularClcr({ edadAnios, pesoKg, creatininaMgDl, sexo });
  } catch (e) {
    // Un cero o un negativo mientras se tipea no es un error que mostrar: es
    // un campo a medio escribir.
    if (e instanceof DatoClinicoInvalido) return null;
    throw e;
  }
}
