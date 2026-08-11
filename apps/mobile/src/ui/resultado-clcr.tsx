import { Text, View } from 'react-native';

import {
  calcularClcr,
  claveColorPorClcr,
  COLOR_SEVERIDAD,
  DatoClinicoInvalido,
  type Sexo,
} from '@gfh/shared-types';

/**
 * El Clcr, calculado mientras el médico escribe.
 *
 * Antes los tres campos —altura, peso, creatinina— existían para producir un
 * número que la pantalla nunca mostraba: se escribían a ciegas y el resultado
 * aparecía recién en el cockpit, después de crear al paciente. Mostrarlo acá no
 * agrega un dato nuevo, muestra el que ya se estaba calculando.
 *
 * Usa `calcularClcr` de `@gfh/shared-types`, la MISMA función que corre el
 * backend al guardar. No es una aproximación para la vista: si difiriera, el
 * número que el médico vio al cargar no sería el que decide los ajustes.
 *
 * Regla 5: sin datos suficientes se dice que falta, no se insinúa que está
 * bien. El gris de "sin dato" es tan informativo como el rojo.
 */
export function ResultadoClcr({
  edadAnios,
  pesoKg,
  creatininaMgDl,
  sexo,
}: {
  edadAnios: number | null;
  pesoKg: number | null;
  creatininaMgDl: number | null;
  sexo: Sexo;
}) {
  const clcr = calcular(edadAnios, pesoKg, creatininaMgDl, sexo);
  const color = COLOR_SEVERIDAD[claveColorPorClcr(clcr)];

  return (
    <View className="mt-3 flex-row items-center rounded-chip bg-primary-light px-3 py-2.5">
      <Text
        className="font-mono-fuerte mr-3"
        style={{ color, fontSize: 21, fontVariant: ['tabular-nums'] }}
      >
        {clcr ?? '—'}
      </Text>
      <View className="flex-1">
        <Text className="font-medio text-meta text-ink">
          {clcr !== null ? 'Clcr mL/min · Cockcroft-Gault' : 'Clcr sin calcular'}
        </Text>
        <Text className="font-sans text-eyebrow leading-4 text-ink-suave">
          {clcr !== null
            ? 'Se recalcula al cambiar peso, creatinina o fecha.'
            : 'Falta peso o creatinina. El ajuste renal queda en neutro.'}
        </Text>
      </View>
    </View>
  );
}

/**
 * `null` cuando no alcanza para calcular — falta un dato o está fuera de rango.
 *
 * Los rangos los rechaza `calcularClcr` con una excepción, y acá se traduce a
 * "todavía no": mientras se tipea "1" camino a "1,4" el valor pasa por estados
 * imposibles, y un error rojo en cada tecla sería ruido, no ayuda.
 */
function calcular(
  edadAnios: number | null,
  pesoKg: number | null,
  creatininaMgDl: number | null,
  sexo: Sexo,
): number | null {
  if (edadAnios === null || pesoKg === null || creatininaMgDl === null) return null;

  try {
    return calcularClcr({ edadAnios, pesoKg, creatininaMgDl, sexo });
  } catch (e) {
    if (e instanceof DatoClinicoInvalido) return null;
    throw e;
  }
}
