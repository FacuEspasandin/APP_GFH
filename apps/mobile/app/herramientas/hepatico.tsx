import { View } from 'react-native';

import { moldeChildPugh } from '@/dominio/molde-child-pugh';
import { Calculadora } from '@/ui/calculadora';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';

/**
 * Herramienta 4 — Child-Pugh sobre datos sueltos.
 *
 * Primera calculadora dibujada desde el molde en vez de escrita a mano. Lo que
 * antes eran 57 líneas de pantalla más 524 de formulario compartido es ahora
 * una declaración y el renderizador genérico.
 *
 * Es LIBRE y no toca la red: Child-Pugh es una fórmula publicada, igual que
 * Cockcroft-Gault en `clcr.tsx`. Cruzar la clase contra el catálogo —cuánto
 * ajustar CADA fármaco— es otra herramienta y sí consume suscripción, igual
 * que el par `clcr.tsx` / `renal.tsx`: ver `ajuste-hepatico.tsx`.
 *
 * Sin `guardar`: las herramientas sueltas son descartables a propósito (modelo
 * §5), y el molde pone el pie de «no se guarda nada» justamente cuando no se
 * le pasa una forma de guardar.
 *
 * Sin `calcular`: el resultado es de tipo puntaje, y el puntaje sale de los
 * puntos que declara cada banda. No hay fórmula que correr.
 */
export default function HerramientaHepatica() {
  return (
    <View className="flex-1 bg-paper">
      <EncabezadoApp />
      <EncabezadoHerramienta icono="higado" titulo="Child-Pugh" tono="aviso">
        Evaluación de la gravedad de la enfermedad hepática crónica.
      </EncabezadoHerramienta>
      <Calculadora molde={moldeChildPugh(false)} />
    </View>
  );
}
