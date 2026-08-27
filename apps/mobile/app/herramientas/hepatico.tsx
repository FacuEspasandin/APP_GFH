import { Stack } from 'expo-router';

import { moldeChildPugh } from '@/dominio/molde-child-pugh';
import { Calculadora } from '@/ui/calculadora';

/**
 * Herramienta 4 — Child-Pugh sobre datos sueltos.
 *
 * Primera calculadora dibujada desde el molde en vez de escrita a mano. Lo que
 * antes eran 57 líneas de pantalla más 524 de formulario compartido es ahora
 * una declaración y el renderizador genérico.
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
    <>
      <Stack.Screen options={{ title: 'Child-Pugh' }} />
      <Calculadora molde={moldeChildPugh(false)} />
    </>
  );
}
