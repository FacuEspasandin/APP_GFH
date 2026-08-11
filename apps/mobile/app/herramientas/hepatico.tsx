import { Text } from 'react-native';

import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Estado, Pantalla } from '@/ui/kit';

/**
 * Herramienta 4 (4.8 / 4.9): ajuste hepático.
 *
 * No hay tabla de datos. GFH nunca tuvo ajuste hepático y la clasificación
 * clínica (Child-Pugh u otra) todavía no está confirmada — se cierra recién
 * cuando se construya la primera fuente real.
 *
 * La pantalla dice exactamente eso. La alternativa —mostrar un formulario que
 * siempre devuelve vacío— se leería como "no hay problema", que es justo lo que
 * la regla 5 prohíbe.
 */
export default function HerramientaHepatico() {
  return (
    <Pantalla>
      <Estado
        titulo="Todavía no disponible"
        detalle="El ajuste hepático no tiene tabla de datos cargada."
      />

      <BloqueFormulario titulo="Qué falta">
        <Text className="font-sans text-meta leading-5 text-ink-suave">
          Una fuente de dosis por grado de función hepática, y la clasificación con la que medirlo —
          Child-Pugh es la propuesta, sin confirmar todavía.
        </Text>
      </BloqueFormulario>

      <BloqueFormulario titulo="Cómo va a funcionar">
        <Text className="font-sans text-meta leading-5 text-ink-suave">
          Igual que el ajuste renal: el grado directo, o los valores para calcularlo, contra los
          fármacos que cargues.
        </Text>
      </BloqueFormulario>

      <BloqueFormulario titulo="Por qué no hay un formulario">
        <Text className="font-sans text-meta leading-5 text-ink-suave">
          Un formulario que siempre devuelve vacío se lee como «no hay problema». Sin dato, el
          sistema dice que no sabe.
        </Text>
      </BloqueFormulario>
    </Pantalla>
  );
}
