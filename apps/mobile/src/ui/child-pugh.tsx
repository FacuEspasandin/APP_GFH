import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  bandaActiva,
  claveColorClase,
  BANDAS_ALBUMINA,
  BANDAS_BILIRRUBINA,
  BANDAS_INR,
  contestado,
  CRITERIOS,
  criterioAbierto,
  criterioSiguiente,
  cuantosContestados,
  evaluar,
  textoDeFaltantes,
  type Banda,
  type Borrador,
} from '@/dominio/hepatico';
import { Icono } from '@/ui/iconos';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import {
  COLOR_SEVERIDAD,
  GLOSA_CLASE,
  NOMBRE_ASCITIS,
  NOMBRE_ENCEFALOPATIA,
  type Ascitis,
  type CriterioChildPugh,
  type Encefalopatia,
  type Punto,
} from '@gfh/shared-types';

/**
 * El formulario de Child-Pugh, compartido por las dos pantallas que lo usan:
 * la del paciente —que guarda— y la herramienta suelta —que descarta.
 *
 * Está acá y no duplicado porque la diferencia entre las dos es qué se hace con
 * el resultado, no cómo se pide el dato. Dos copias serían dos escalas el día
 * que una se toque.
 *
 * **Se contesta tocando, no escribiendo.** La escala no distingue una
 * bilirrubina de 2,4 de una de 2,9 —las dos son «2 – 3», dos puntos—, así que
 * pedir el número para después clasificarlo era pedir un dato más fino del que
 * el cálculo usa. El selector de unidad se queda y ahora hace algo más útil:
 * reetiqueta las bandas, «< 2 mg/dL» pasa a «< 34 µmol/L».
 *
 * **Y de a uno.** Los cinco criterios abiertos eran tres pantallas de scroll
 * antes de contestar nada. Aparecen en orden, y lo contestado se pliega a un
 * renglón que se puede volver a abrir — si se quedara como tarjeta, al quinto
 * hay cinco tarjetas y volvimos al scroll.
 */

const TITULO: Record<CriterioChildPugh, string> = {
  bilirrubina: 'Bilirrubina total',
  albumina: 'Albúmina sérica',
  inr: 'INR',
  ascitis: 'Ascitis',
  encefalopatia: 'Encefalopatía',
};

/** El nombre corto del renglón plegado: «Bilirrubina», no «Bilirrubina total». */
const CORTO: Record<CriterioChildPugh, string> = {
  bilirrubina: 'Bilirrubina',
  albumina: 'Albúmina',
  inr: 'INR',
  ascitis: 'Ascitis',
  encefalopatia: 'Encefalopatía',
};

export function FormularioChildPugh({
  valor,
  onCambio,
  conValorExacto = false,
}: {
  valor: Borrador;
  onCambio: (b: Borrador) => void;
  /**
   * Muestra el campo opcional del valor de laboratorio.
   *
   * Sólo en la pantalla del paciente: ahí el número se guarda y el historial
   * puede decir «2,4 → 3,1 mg/dL». La herramienta suelta descarta todo al
   * salir, así que pedirlo sería pedir por pedir.
   */
  conValorExacto?: boolean;
}) {
  const [abiertoAMano, setAbiertoAMano] = useState<CriterioChildPugh | null>(null);

  const abierto = criterioAbierto(valor, abiertoAMano);
  const siguiente = criterioSiguiente(valor, abierto);
  const poner = (parcial: Partial<Borrador>) => onCambio({ ...valor, ...parcial });

  /** Contestar cierra: el que sigue se abre solo por estar sin contestar. */
  const responder = (parcial: Partial<Borrador>) => {
    setAbiertoAMano(null);
    poner(parcial);
  };

  return (
    <>
      <Avance hechos={cuantosContestados(valor)} />

      {CRITERIOS.map((c) => {
        if (c === abierto) {
          return (
            <Abierto
              key={c}
              criterio={c}
              valor={valor}
              conValorExacto={conValorExacto}
              onResponder={responder}
              onCambio={poner}
            />
          );
        }
        if (contestado(valor, c)) {
          return (
            <Plegado key={c} criterio={c} valor={valor} onAbrir={() => setAbiertoAMano(c)} />
          );
        }
        if (c === siguiente) return <Anticipo key={c} criterio={c} />;
        return null;
      })}
    </>
  );
}

/** «3 de 5» con barra: apareciendo de a uno, sin esto no se ve cuánto falta. */
function Avance({ hechos }: { hechos: number }) {
  const col = useColores();

  return (
    <View className="mb-3 flex-row items-center px-1" style={{ gap: 8 }}>
      <Text className="font-mono text-eyebrow uppercase tracking-wider text-tenue">
        {hechos} de 5
      </Text>
      <View className="h-1 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: col.line }}>
        <View
          style={{
            width: `${(hechos / 5) * 100}%`,
            height: '100%',
            backgroundColor: col.primary,
          }}
        />
      </View>
    </View>
  );
}

/** El criterio que se está contestando. */
function Abierto({
  criterio,
  valor,
  conValorExacto,
  onResponder,
  onCambio,
}: {
  criterio: CriterioChildPugh;
  valor: Borrador;
  conValorExacto: boolean;
  onResponder: (b: Partial<Borrador>) => void;
  onCambio: (b: Partial<Borrador>) => void;
}) {
  if (criterio === 'ascitis') {
    return (
      <Bloque titulo={TITULO.ascitis}>
        <Opciones
          opciones={(['AUSENTE', 'LEVE', 'MODERADA_SEVERA'] as Ascitis[]).map((a, i) => ({
            texto: NOMBRE_ASCITIS[a],
            puntos: (i + 1) as Punto,
            elegir: () => onResponder({ ascitis: a }),
          }))}
          activa={bandaActiva(evaluar(valor).detalle.ascitis)}
        />
      </Bloque>
    );
  }

  if (criterio === 'encefalopatia') {
    return (
      <Bloque titulo={TITULO.encefalopatia}>
        <Opciones
          opciones={(['AUSENTE', 'GRADO_1_2', 'GRADO_3_4'] as Encefalopatia[]).map((e, i) => ({
            texto: NOMBRE_ENCEFALOPATIA[e],
            puntos: (i + 1) as Punto,
            elegir: () => onResponder({ encefalopatia: e }),
          }))}
          activa={bandaActiva(evaluar(valor).detalle.encefalopatia)}
        />
      </Bloque>
    );
  }

  const config = {
    bilirrubina: {
      bandas: BANDAS_BILIRRUBINA[valor.unidadBilirrubina],
      unidades: ['mg/dL', 'umol/L'] as const,
      rotulos: { 'mg/dL': 'mg/dL', 'umol/L': 'µmol/L' } as Record<string, string>,
      unidad: valor.unidadBilirrubina as string,
      ponerUnidad: (u: string) => onCambio({ unidadBilirrubina: u as 'mg/dL' | 'umol/L' }),
      elegir: (p: Punto) => onResponder({ bilirrubina: p }),
      textoValor: valor.bilirrubinaValor,
      ponerValor: (t: string) => onCambio({ bilirrubinaValor: t }),
    },
    albumina: {
      bandas: BANDAS_ALBUMINA[valor.unidadAlbumina],
      unidades: ['g/dL', 'g/L'] as const,
      rotulos: { 'g/dL': 'g/dL', 'g/L': 'g/L' } as Record<string, string>,
      unidad: valor.unidadAlbumina as string,
      ponerUnidad: (u: string) => onCambio({ unidadAlbumina: u as 'g/dL' | 'g/L' }),
      elegir: (p: Punto) => onResponder({ albumina: p }),
      textoValor: valor.albuminaValor,
      ponerValor: (t: string) => onCambio({ albuminaValor: t }),
    },
    inr: {
      bandas: BANDAS_INR,
      unidades: null,
      rotulos: {} as Record<string, string>,
      unidad: '',
      ponerUnidad: () => {},
      elegir: (p: Punto) => onResponder({ inr: p }),
      textoValor: valor.inrValor,
      ponerValor: (t: string) => onCambio({ inrValor: t }),
    },
  }[criterio];

  return (
    <Bloque
      titulo={TITULO[criterio]}
      unidades={config.unidades}
      rotulos={config.rotulos}
      unidad={config.unidad}
      onUnidad={config.ponerUnidad}
    >
      <Opciones
        opciones={config.bandas.map((b: Banda) => ({
          texto: b.texto,
          puntos: b.puntos,
          elegir: () => config.elegir(b.puntos),
        }))}
        activa={bandaActiva(evaluar(valor).detalle[criterio])}
      />

      {conValorExacto ? <ValorExacto texto={config.textoValor} onTexto={config.ponerValor} /> : null}
    </Bloque>
  );
}

/**
 * El valor de laboratorio, opcional y sin efecto sobre el puntaje.
 *
 * Lo dice el rótulo porque si no se lee como un campo obligatorio más: quien
 * lo complete tiene que saber que no cambia nada de lo que ve, sólo lo que
 * queda escrito en el historial.
 */
function ValorExacto({ texto, onTexto }: { texto: string; onTexto: (t: string) => void }) {
  const col = useColores();

  return (
    <View className="mt-3 border-t border-line pt-3">
      <Text className="font-sans mb-1.5 text-eyebrow leading-4 text-ink-suave">
        Valor exacto, si lo tenés. No cambia el puntaje: queda anotado en el historial.
      </Text>
      <TextInput
        value={texto}
        onChangeText={onTexto}
        keyboardType="numeric"
        placeholder="opcional"
        placeholderTextColor={col.tenue}
        className="font-mono rounded border border-line bg-paper px-3 py-2 text-body text-ink"
      />
    </View>
  );
}

/** Un criterio ya contestado: una línea, no una tarjeta. */
function Plegado({
  criterio,
  valor,
  onAbrir,
}: {
  criterio: CriterioChildPugh;
  valor: Borrador;
  onAbrir: () => void;
}) {
  const col = useColores();
  const puntos = evaluar(valor).detalle[criterio] ?? 0;

  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={`${CORTO[criterio]}, ${etiqueta(criterio, valor)}. Tocar para cambiar`}
      className="mb-2 flex-row items-center rounded-card border border-line bg-surface px-3 py-2.5"
    >
      <View
        className="mr-2.5 h-5 w-5 items-center justify-center rounded-full"
        style={{ backgroundColor: col.primaryLight }}
      >
        <Icono nombre="check" tamano={12} color={col.primary} />
      </View>

      <Text className="flex-1 text-body text-ink">{CORTO[criterio]}</Text>

      <Text className="font-mono mr-3 text-meta text-ink-suave">
        {etiqueta(criterio, valor)}
      </Text>
      <Text className="font-mono-fuerte text-eyebrow" style={{ color: col.primary }}>
        {puntos} PT
      </Text>
    </Pressable>
  );
}

/** Qué dice el renglón plegado: la banda elegida, con su unidad. */
function etiqueta(criterio: CriterioChildPugh, b: Borrador): string {
  if (criterio === 'ascitis') return b.ascitis === null ? '' : NOMBRE_ASCITIS[b.ascitis];
  if (criterio === 'encefalopatia') {
    return b.encefalopatia === null ? '' : NOMBRE_ENCEFALOPATIA[b.encefalopatia];
  }

  if (criterio === 'inr') {
    return BANDAS_INR.find((x) => x.puntos === b.inr)?.texto ?? '';
  }
  if (criterio === 'bilirrubina') {
    const t = BANDAS_BILIRRUBINA[b.unidadBilirrubina].find((x) => x.puntos === b.bilirrubina);
    return t ? `${t.texto} ${b.unidadBilirrubina === 'mg/dL' ? 'mg/dL' : 'µmol/L'}` : '';
  }
  const t = BANDAS_ALBUMINA[b.unidadAlbumina].find((x) => x.puntos === b.albumina);
  return t ? `${t.texto} ${b.unidadAlbumina}` : '';
}

/** El que viene, apagado. Sin esto la pantalla parece terminada. */
function Anticipo({ criterio }: { criterio: CriterioChildPugh }) {
  const col = useColores();

  return (
    <View
      className="mb-2 items-center rounded-card px-3 py-3.5"
      style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: col.line }}
    >
      <Text className="font-sans text-meta text-tenue">{TITULO[criterio]}</Text>
    </View>
  );
}

function Bloque({
  titulo,
  unidades,
  rotulos,
  unidad,
  onUnidad,
  children,
}: {
  titulo: string;
  unidades?: readonly string[] | null;
  rotulos?: Record<string, string>;
  unidad?: string;
  onUnidad?: (u: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Superficie elevacion="plana" className="mb-2 px-3.5 py-3.5">
      <View className="mb-2.5 flex-row items-center justify-between">
        <Text className="text-fila font-fuerte text-ink">{titulo}</Text>
        {unidades && onUnidad ? (
          <SelectorUnidad
            unidades={unidades}
            rotulos={rotulos ?? {}}
            activa={unidad ?? ''}
            onElegir={onUnidad}
          />
        ) : null}
      </View>
      {children}
    </Superficie>
  );
}

/**
 * El selector de unidad.
 *
 * No convierte ningún número: reetiqueta las bandas. Se toca la que dice el
 * análisis que el médico tiene en la mano.
 */
function SelectorUnidad({
  unidades,
  rotulos,
  activa,
  onElegir,
}: {
  unidades: readonly string[];
  rotulos: Record<string, string>;
  activa: string;
  onElegir: (u: string) => void;
}) {
  const col = useColores();

  return (
    <View className="flex-row overflow-hidden rounded border border-line">
      {unidades.map((u, i) => (
        <Pressable
          key={u}
          onPress={() => onElegir(u)}
          accessibilityRole="button"
          accessibilityState={{ selected: u === activa }}
          className="px-2.5 py-1"
          style={{
            backgroundColor: u === activa ? col.primary : col.surface,
            borderLeftWidth: i === 0 ? 0 : 1,
            borderLeftColor: col.line,
          }}
        >
          <Text
            className="font-mono text-eyebrow"
            style={{ color: u === activa ? '#FFFFFF' : col.inkSuave }}
          >
            {rotulos[u] ?? u}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Las tres cajas. Son el control: no acompañan a un campo, lo reemplazan. */
function Opciones({
  opciones,
  activa,
}: {
  opciones: { texto: string; puntos: Punto; elegir: () => void }[];
  activa: number | null;
}) {
  const col = useColores();

  return (
    <View className="flex-row" style={{ gap: 7 }}>
      {opciones.map((o, i) => {
        const encendida = i === activa;
        return (
          <Pressable
            key={o.texto}
            onPress={o.elegir}
            accessibilityRole="button"
            accessibilityState={{ selected: encendida }}
            accessibilityLabel={`${o.texto}, ${o.puntos} puntos`}
            className="flex-1 items-center justify-center rounded px-1 py-2.5"
            style={{
              backgroundColor: encendida ? col.primary : col.surface,
              borderWidth: 1,
              borderColor: encendida ? col.primary : col.line,
              minHeight: 56,
            }}
          >
            <Text
              className="font-mono-fuerte text-center text-meta"
              style={{ color: encendida ? '#FFFFFF' : col.ink }}
            >
              {o.texto}
            </Text>
            <Text
              className="font-mono mt-1 text-eyebrow"
              style={{ color: encendida ? 'rgba(255,255,255,0.75)' : col.tenue }}
            >
              {o.puntos} PT
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * La clase, arriba de todo.
 *
 * No se dibuja hasta que haya al menos un criterio contestado: un «—» grande
 * antes de tocar nada ocupa el lugar más caro de la pantalla para no decir
 * nada. Desde el primero muestra el puntaje parcial, que sí informa.
 */
export function ResultadoChildPugh({ valor }: { valor: Borrador }) {
  const r = evaluar(valor);
  if (cuantosContestados(valor) === 0) return null;

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
          {r.puntos} de 15 puntos{r.completo ? '' : ' parciales'}
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
