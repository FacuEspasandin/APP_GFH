import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { claveColorPorClcr, COLOR_SEVERIDAD } from '@gfh/shared-types';

/**
 * El Clcr como anillo.
 *
 * Por qué un anillo y no sólo el número: 26,5 mL/min no significa nada por sí
 * solo para quien no vive en la escala. El arco lo ubica contra el rango
 * completo de un vistazo, y el número sigue estando porque el color nunca es
 * el único portador de información — la misma regla que el resto del sistema.
 *
 * Dibujado con `react-native-svg` y NO con Skia, aunque Skia esté instalado:
 * en web Skia necesita cargar su WASM antes del primer render y hasta entonces
 * el módulo llega `undefined`, así que la pantalla se cae. Partirlo por
 * plataforma sería peor — dejaría de verificarse lo que realmente corre en el
 * teléfono. Para un arco estático el SVG da el mismo resultado.
 *
 * El degradado va del color de severidad a una versión más clara del MISMO
 * color; nunca cruza a otro color de la escala, que insinuaría una gravedad
 * distinta a la real.
 *
 * "Sin dato" se pinta neutro y con el anillo vacío. Nunca verde: la regla 5 del
 * documento funcional es no inferir seguridad cuando falta el dato.
 */

/** Tope de la escala. Por encima de 120 el anillo queda lleno y ya no informa
 *  más — lo que importa arriba de ese valor es que la función es normal. */
const TOPE = 120;

/** Aclara un hex mezclándolo con blanco. El otro extremo del degradado. */
function aclarar(hex: string, proporcion: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mezclar = (c: number) => Math.round(c + (255 - c) * proporcion);
  return `rgb(${mezclar((n >> 16) & 255)}, ${mezclar((n >> 8) & 255)}, ${mezclar(n & 255)})`;
}

export function AnilloClcr({
  clcrMlMin,
  gradoKdigo,
  tamano = 104,
}: {
  clcrMlMin: number | null;
  gradoKdigo: string | null;
  tamano?: number;
}) {
  const color = COLOR_SEVERIDAD[claveColorPorClcr(clcrMlMin)];

  const grosor = Math.round(tamano * 0.09);
  const radio = (tamano - grosor) / 2;
  const centro = tamano / 2;
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
        <Defs>
          <LinearGradient id="arco" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={aclarar(color, 0.4)} />
            <Stop offset="1" stopColor={color} />
          </LinearGradient>
        </Defs>

        <Circle
          cx={centro}
          cy={centro}
          r={radio}
          stroke={COLOR_SEVERIDAD.neutro}
          strokeOpacity={0.14}
          strokeWidth={grosor}
          fill="none"
        />

        {clcrMlMin !== null ? (
          <>
            {/* Trazo ancho y translúcido debajo: da volumen al arco sin sumar
                otro tono a una pantalla donde el color significa gravedad. */}
            <Circle
              cx={centro}
              cy={centro}
              r={radio}
              stroke={color}
              strokeOpacity={0.16}
              strokeWidth={grosor + 6}
              strokeLinecap="round"
              strokeDasharray={`${pintado} ${circunferencia - pintado}`}
              fill="none"
            />
            <Circle
              cx={centro}
              cy={centro}
              r={radio}
              stroke="url(#arco)"
              strokeWidth={grosor}
              strokeLinecap="round"
              strokeDasharray={`${pintado} ${circunferencia - pintado}`}
              fill="none"
            />
          </>
        ) : null}
      </Svg>

      <View className="items-center">
        <Text
          className="font-mono-fuerte"
          style={{
            color,
            fontSize: Math.round(tamano * 0.25),
            lineHeight: Math.round(tamano * 0.3),
            fontVariant: ['tabular-nums'],
          }}
        >
          {clcrMlMin ?? '—'}
        </Text>
        <Text
          className="font-sans text-ink-suave"
          style={{ fontSize: Math.round(tamano * 0.105), marginTop: -2 }}
        >
          {clcrMlMin === null ? 'sin dato' : 'mL/min'}
        </Text>
        {gradoKdigo ? (
          <View className="mt-1 rounded-full px-2 py-0.5" style={{ backgroundColor: `${color}1F` }}>
            <Text
              className="font-fuerte"
              style={{ color, fontSize: Math.round(tamano * 0.1), letterSpacing: 0.4 }}
            >
              {gradoKdigo}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
