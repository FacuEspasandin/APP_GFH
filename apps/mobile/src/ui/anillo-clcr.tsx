import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { claveColorPorClcr, COLOR_SEVERIDAD } from '@gfh/shared-types';

/**
 * El Clcr como anillo.
 *
 * Por qué un anillo y no sólo el número: 26,5 mL/min no significa nada por sí
 * solo para quien no vive en la escala. El arco lo ubica contra el rango
 * completo de un vistazo, y el número sigue estando porque el color nunca es
 * el único portador de información — la misma regla que el resto del sistema.
 *
 * Se dibuja con `react-native-svg`, que ya usamos para los íconos. Skia daría
 * lo mismo acá: un arco estático no necesita un motor gráfico, y sí agregaría
 * un módulo nativo pesado.
 *
 * "Sin dato" se pinta neutro y con el anillo vacío. Nunca verde: la regla 5 del
 * documento funcional es no inferir seguridad cuando falta el dato.
 */

/** Tope de la escala. Por encima de 120 el anillo queda lleno y ya no informa
 *  más — lo que importa arriba de ese valor es que la función es normal. */
const TOPE = 120;

export function AnilloClcr({
  clcrMlMin,
  gradoKdigo,
  tamano = 96,
}: {
  clcrMlMin: number | null;
  gradoKdigo: string | null;
  tamano?: number;
}) {
  const color = COLOR_SEVERIDAD[claveColorPorClcr(clcrMlMin)];

  const grosor = Math.round(tamano * 0.085);
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;

  const proporcion = clcrMlMin === null ? 0 : Math.min(clcrMlMin, TOPE) / TOPE;
  const pintado = circunferencia * proporcion;

  return (
    <View style={{ width: tamano, height: tamano }} className="items-center justify-center">
      <Svg
        width={tamano}
        height={tamano}
        // Arranca arriba en vez de a la derecha, que es como se lee un medidor.
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          stroke={COLOR_SEVERIDAD.neutro}
          strokeOpacity={0.18}
          strokeWidth={grosor}
          fill="none"
        />
        {clcrMlMin !== null ? (
          <Circle
            cx={tamano / 2}
            cy={tamano / 2}
            r={radio}
            stroke={color}
            strokeWidth={grosor}
            strokeLinecap="round"
            strokeDasharray={`${pintado} ${circunferencia - pintado}`}
            fill="none"
          />
        ) : null}
      </Svg>

      <View className="items-center">
        <Text
          className="font-mono-fuerte"
          style={{
            color,
            fontSize: Math.round(tamano * 0.24),
            fontVariant: ['tabular-nums'],
          }}
        >
          {clcrMlMin ?? '—'}
        </Text>
        <Text
          className="font-sans text-ink-suave"
          style={{ fontSize: Math.round(tamano * 0.11) }}
        >
          {clcrMlMin === null ? 'sin dato' : 'mL/min'}
        </Text>
        {gradoKdigo ? (
          <Text
            className="font-medio"
            style={{ color, fontSize: Math.round(tamano * 0.115), marginTop: 1 }}
          >
            {gradoKdigo}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
