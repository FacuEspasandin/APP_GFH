import { claveColorPorClcr, COLOR_SEVERIDAD } from '@gfh/shared-types';

import { Anillo } from './anillo';

/**
 * El clearance como anillo.
 *
 * Lo que era propio del Clcr y lo que es de cualquier cifra con escala vivían
 * juntos. El dibujo se fue a `anillo.tsx`, que lo comparte con el molde de
 * calculadoras; acá quedan las tres decisiones clínicas.
 */

/** Tope de la escala. Por encima de 120 el anillo queda lleno y ya no informa
 *  más — lo que importa arriba de ese valor es que la función es normal. */
const TOPE = 120;

export function AnilloClcr({
  clcrMlMin,
  gradoKdigo,
  tamano = 104,
}: {
  clcrMlMin: number | null;
  gradoKdigo: string | null;
  tamano?: number;
}) {
  return (
    <Anillo
      valor={clcrMlMin}
      maximo={TOPE}
      color={COLOR_SEVERIDAD[claveColorPorClcr(clcrMlMin)]}
      sufijo="mL/min"
      insignia={gradoKdigo}
      tamano={tamano}
    />
  );
}
