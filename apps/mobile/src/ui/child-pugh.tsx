import { Pressable, Text, TextInput, View } from 'react-native';

import {
  bandaActiva,
  BANDAS_ALBUMINA,
  BANDAS_BILIRRUBINA,
  BANDAS_INR,
  claveColorClase,
  evaluar,
  textoDeFaltantes,
  type Banda,
  type Borrador,
} from '@/dominio/hepatico';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import {
  COLOR_SEVERIDAD,
  GLOSA_CLASE,
  NOMBRE_ASCITIS,
  NOMBRE_ENCEFALOPATIA,
  type Ascitis,
  type Encefalopatia,
} from '@gfh/shared-types';

/**
 * El formulario de Child-Pugh, compartido por las dos pantallas que lo usan:
 * la del paciente —que guarda— y la herramienta suelta —que descarta.
 *
 * Está acá y no duplicado porque la diferencia entre las dos es qué se hace con
 * el resultado, no cómo se pide el dato. Dos copias serían dos escalas el día
 * que una se toque.
 */

export function FormularioChildPugh({
  valor,
  onCambio,
}: {
  valor: Borrador;
  onCambio: (b: Borrador) => void;
}) {
  const poner = (parcial: Partial<Borrador>) => onCambio({ ...valor, ...parcial });
  const r = evaluar(valor);

  return (
    <>
      <Criterio
        titulo="Bilirrubina total"
        texto={valor.bilirrubina}
        onTexto={(bilirrubina) => poner({ bilirrubina })}
        unidades={['mg/dL', 'umol/L']}
        rotulos={{ 'mg/dL': 'mg/dL', 'umol/L': 'µmol/L' }}
        unidad={valor.unidadBilirrubina}
        onUnidad={(unidadBilirrubina) => poner({ unidadBilirrubina })}
        bandas={BANDAS_BILIRRUBINA[valor.unidadBilirrubina]}
        activa={bandaActiva(r.detalle.bilirrubina)}
      />

      <Criterio
        titulo="Albúmina sérica"
        texto={valor.albumina}
        onTexto={(albumina) => poner({ albumina })}
        unidades={['g/dL', 'g/L']}
        rotulos={{ 'g/dL': 'g/dL', 'g/L': 'g/L' }}
        unidad={valor.unidadAlbumina}
        onUnidad={(unidadAlbumina) => poner({ unidadAlbumina })}
        bandas={BANDAS_ALBUMINA[valor.unidadAlbumina]}
        activa={bandaActiva(r.detalle.albumina)}
      />

      <Criterio
        titulo="INR"
        texto={valor.inr}
        onTexto={(inr) => poner({ inr })}
        bandas={BANDAS_INR}
        activa={bandaActiva(r.detalle.inr)}
      />

      <Opciones<Ascitis>
        titulo="Ascitis"
        opciones={['AUSENTE', 'LEVE', 'MODERADA_SEVERA']}
        nombres={NOMBRE_ASCITIS}
        elegida={valor.ascitis}
        onElegir={(ascitis) => poner({ ascitis })}
      />

      <Opciones<Encefalopatia>
        titulo="Encefalopatía"
        opciones={['AUSENTE', 'GRADO_1_2', 'GRADO_3_4']}
        nombres={NOMBRE_ENCEFALOPATIA}
        elegida={valor.encefalopatia}
        onElegir={(encefalopatia) => poner({ encefalopatia })}
      />
    </>
  );
}

/**
 * El resultado.
 *
 * Se muestra siempre, también incompleto: con dos criterios cargados dice «4 de
 * 15» y qué falta. Una pantalla que sólo repite «respondé todo» hasta el final
 * no informa nada.
 */
export function ResultadoChildPugh({ valor }: { valor: Borrador }) {
  const col = useColores();
  const r = evaluar(valor);

  const color = COLOR_SEVERIDAD[claveColorClase(r.clase)];
  const falta = textoDeFaltantes(r.faltan);

  return (
    <Superficie
      elevacion="media"
      className="mb-3.5 px-4 py-3.5"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <View className="flex-row items-baseline">
        <Text
          className="font-mono-fuerte mr-3"
          style={{ fontSize: 26, color, fontVariant: ['tabular-nums'] }}
        >
          {r.clase === null ? '—' : `Clase ${r.clase}`}
        </Text>
        <Text
          className="font-mono flex-1 text-meta text-ink-suave"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {r.puntos} de 15 puntos
        </Text>
      </View>

      <Text className="font-sans mt-2 text-meta leading-5 text-ink-suave">
        {r.clase === null
          ? /* Regla 5: con un criterio sin cargar no hay clase, y se dice por
               qué en vez de mostrar un puntaje suelto que parezca el final. */
            'Con un criterio sin cargar no hay clase: el puntaje parcial no se redondea hacia ningún lado.'
          : GLOSA_CLASE[r.clase]}
      </Text>

      {falta ? (
        <Text className="font-mono mt-2.5 border-t border-line pt-2.5 text-eyebrow uppercase tracking-wider text-tenue">
          {falta}
        </Text>
      ) : null}
    </Superficie>
  );
}

// --- piezas ------------------------------------------------------------------

function Criterio<U extends string>({
  titulo,
  texto,
  onTexto,
  unidades,
  rotulos,
  unidad,
  onUnidad,
  bandas,
  activa,
}: {
  titulo: string;
  texto: string;
  onTexto: (v: string) => void;
  unidades?: readonly U[];
  rotulos?: Record<U, string>;
  unidad?: U;
  onUnidad?: (u: U) => void;
  bandas: Banda[];
  activa: number | null;
}) {
  const col = useColores();

  return (
    <Superficie elevacion="plana" className="mb-3 px-3.5 py-3.5">
      <View className="mb-2.5 flex-row items-center">
        <Text className="flex-1 text-fila font-medio text-ink">{titulo}</Text>

        {/* La unidad va acá, al lado del campo, y no en un bloque de opciones
            al final de la pantalla: si se elige mal, se descubre recién después
            de haber leído los rangos equivocados. */}
        {unidades && unidad && onUnidad && rotulos ? (
          <View className="flex-row overflow-hidden rounded-chip border border-line">
            {unidades.map((u) => (
              <Pressable
                key={u}
                onPress={() => onUnidad(u)}
                accessibilityRole="button"
                accessibilityState={{ selected: u === unidad }}
                className="px-2.5 py-1"
                style={{ backgroundColor: u === unidad ? col.primary : 'transparent' }}
              >
                <Text
                  className="font-mono text-eyebrow"
                  style={{ color: u === unidad ? '#FFFFFF' : col.inkSuave }}
                >
                  {rotulos[u]}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <TextInput
        value={texto}
        onChangeText={onTexto}
        keyboardType="decimal-pad"
        placeholder="valor del análisis"
        placeholderTextColor={col.tenue}
        accessibilityLabel={titulo}
        className="font-mono h-11 rounded-input border border-line bg-surface px-3 text-body text-ink"
      />

      <View className="mt-2.5 flex-row gap-1.5">
        {bandas.map((b, i) => {
          const on = activa === i;
          return (
            <View
              key={b.texto}
              className="flex-1 items-center rounded-input border px-1 py-1.5"
              style={{
                backgroundColor: on ? col.primaryLight : col.surface,
                borderColor: on ? col.primary : col.line,
              }}
            >
              <Text
                className="font-mono text-meta"
                style={{ color: on ? col.primary : col.inkSuave, fontWeight: on ? '600' : '400' }}
              >
                {b.texto}
              </Text>
              <Text
                className="font-mono mt-0.5 text-eyebrow uppercase tracking-wider"
                style={{ color: on ? col.primary : col.tenue }}
              >
                {b.puntos} pt
              </Text>
            </View>
          );
        })}
      </View>
    </Superficie>
  );
}

/** Tres botones y no un desplegable: son tres opciones, un toque alcanza. */
function Opciones<T extends string>({
  titulo,
  opciones,
  nombres,
  elegida,
  onElegir,
}: {
  titulo: string;
  opciones: readonly T[];
  nombres: Record<T, string>;
  elegida: T | null;
  onElegir: (v: T) => void;
}) {
  const col = useColores();

  return (
    <Superficie elevacion="plana" className="mb-3 px-3.5 py-3.5">
      <Text className="mb-2.5 text-fila font-medio text-ink">{titulo}</Text>
      <View className="flex-row gap-1.5">
        {opciones.map((o) => {
          const on = o === elegida;
          return (
            <Pressable
              key={o}
              onPress={() => onElegir(o)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className="flex-1 items-center justify-center rounded-chip border px-2 py-2.5"
              style={{
                backgroundColor: on ? col.primary : col.surface,
                borderColor: on ? col.primary : col.line,
              }}
            >
              <Text
                className="text-center text-meta"
                style={{ color: on ? '#FFFFFF' : col.inkSuave, fontWeight: on ? '600' : '400' }}
              >
                {nombres[o]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Superficie>
  );
}
