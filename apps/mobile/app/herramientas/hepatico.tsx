import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';

import { BORRADOR_VACIO, evaluar, type Borrador } from '@/dominio/hepatico';
import { FormularioChildPugh, ResultadoChildPugh } from '@/ui/child-pugh';
import { Superficie } from '@/ui/superficie';

/**
 * Herramienta 4 — Child-Pugh sobre datos sueltos.
 *
 * Sin paciente y sin guardar nada: las herramientas standalone son descartables
 * a propósito (modelo §5). Por eso no hay botón — el resultado sale solo
 * mientras se escribe y se pierde al salir.
 *
 * A diferencia de las otras tres herramientas, esta no llama al backend: el
 * cálculo es puro y vive en `@gfh/shared-types`, el mismo que usa el servidor.
 * Pedirle a la red que sume cinco números sería agregar una espera y un modo de
 * fallo por nada.
 */
export default function HerramientaHepatica() {
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const r = evaluar(borrador);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-4 pb-8 pt-3" keyboardShouldPersistTaps="handled">
        {/* El resultado arriba, como en la del paciente: es la respuesta. */}
        <ResultadoChildPugh valor={borrador} />

        {/* Sin el campo del valor exacto: acá se descarta todo al salir, así que
            pedirlo sería pedir por pedir. */}
        <FormularioChildPugh valor={borrador} onCambio={setBorrador} />

        {r.clase !== null ? (
          <Superficie elevacion="plana" className="mt-2 px-3.5 py-3">
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              La clase está calculada, pero todavía no hay tabla de ajuste por
              fármaco contra la cual evaluarla. Para eso, por ahora, la app no
              tiene respuesta.
            </Text>
          </Superficie>
        ) : null}

        {/* El aviso de descartable bajó al pie: arriba ocupaba el lugar más
            caro de la pantalla, antes de que se viera un solo criterio. */}
        <Text className="font-sans mt-3 px-1 text-eyebrow leading-4 text-ink-suave">
          Para un paciente que no está cargado. No se guarda nada: al salir de la
          herramienta, estos valores se pierden.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
