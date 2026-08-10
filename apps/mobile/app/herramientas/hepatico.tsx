import { AvisoNeutro, Estado, Pantalla } from '@/ui/kit';

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
        detalle="El ajuste hepático no tiene tabla de datos cargada. Cuando exista, va a funcionar igual que el renal: Child-Pugh directo, o los cinco valores para calcularlo."
      />
      <AvisoNeutro>
        No mostramos un resultado vacío: sin dato, el sistema dice que no sabe.
      </AvisoNeutro>
    </Pantalla>
  );
}
