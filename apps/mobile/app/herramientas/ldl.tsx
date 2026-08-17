import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { CampoTexto } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import {
  calcularLipidos,
  colesterolDesdeMgDl,
  EXPLICACION_SIN_LDL,
  faltantesLipidos,
  rangoConvertido,
  RANGOS,
  type EntradaLipidos,
  type MotivoSinValor,
  type UnidadLipidos,
  type ValorLipidico,
} from '@gfh/shared-types';

/**
 * Colesterol LDL y no-HDL, sobre un perfil lipídico suelto.
 *
 * Es una de las calculadoras libres: cuatro fórmulas publicadas que no tocan el
 * catálogo. No llama al backend — el cálculo es puro y vive en
 * `@gfh/shared-types`, así que también funciona sin señal.
 *
 * Lo que la hace distinta de las otras dos calculadoras: **devuelve dos cifras**
 * —LDL y no-HDL— y una puede apagarse sin la otra. Cuando Friedewald no aplica,
 * el no-HDL sigue siendo válido, y por eso van juntas y a la vista en vez de una
 * escondida detrás de un desplegable.
 *
 * Y cuando el LDL no sale, **siempre se dice por qué**. Un «no se puede
 * calcular» a secas manda al médico a buscar afuera lo que la pantalla ya sabe:
 * si es un dato que falta, si son los triglicéridos, o si los números no cierran
 * entre sí.
 */
export default function CalculadoraLdl() {
  const [texto, setTexto] = useState({ total: '', hdl: '', tg: '' });
  const [unidad, setUnidad] = useState<UnidadLipidos>('mg/dL');

  const entrada: EntradaLipidos = {
    colesterolTotal: aNumero(texto.total),
    hdl: aNumero(texto.hdl),
    trigliceridos: aNumero(texto.tg),
    unidad,
  };

  const r = calcularLipidos(entrada);
  const faltan = faltantesLipidos(entrada);

  /**
   * Los rangos, en la unidad que el médico eligió.
   *
   * Se declaran en mg/dL y se convierten: mostrar «1 – 1000» con mmol/L en
   * pantalla sería peor que no mostrar nada.
   */
  const rangos =
    unidad === 'mg/dL'
      ? {
          total: RANGOS.colesterolTotal,
          hdl: RANGOS.hdl,
          tg: RANGOS.trigliceridos,
        }
      : {
          total: rangoConvertido(RANGOS.colesterolTotal, (n) => colesterolDesdeMgDl(n, unidad), 1),
          hdl: rangoConvertido(RANGOS.hdl, (n) => colesterolDesdeMgDl(n, unidad), 1),
          tg: rangoConvertido(RANGOS.trigliceridos, (n) => n / 88.57, 1),
        };
  const algoEscrito = faltan.length < 3;

  // Las alternativas se abren solas cuando Friedewald no puede: ahí dejan de
  // ser una curiosidad y pasan a ser lo único que queda.
  const [abiertas, setAbiertas] = useState(false);
  const mostrarAlternativas = abiertas || r.ldl.motivo === 'TG_ALTOS';

  return (
    <>
      <Stack.Screen options={{ title: 'Colesterol LDL' }} />
      <KeyboardAvoidingView
        className="flex-1 bg-paper"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="px-4 pb-8 pt-3" keyboardShouldPersistTaps="handled">
          <Superficie elevacion="plana" className="mb-3 px-3.5 py-3.5">
            <View className="mb-2.5 flex-row items-center justify-between">
              <Text className="text-fila font-fuerte text-ink">Perfil lipídico</Text>
              {/* Un solo selector para los tres: un análisis viene entero en la
                  misma unidad, y tres interruptores serían pedir tres veces la
                  misma respuesta. */}
              <SelectorUnidad activa={unidad} onElegir={setUnidad} />
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1">
                <CampoTexto
                  etiqueta="Total"
                  value={texto.total}
                  onChangeText={(v) => setTexto((p) => ({ ...p, total: v }))}
                  keyboardType="numeric"
                  rango={rangos.total}
                  valor={entrada.colesterolTotal}
                />
              </View>
              <View className="flex-1">
                <CampoTexto
                  etiqueta="HDL"
                  value={texto.hdl}
                  onChangeText={(v) => setTexto((p) => ({ ...p, hdl: v }))}
                  keyboardType="numeric"
                  rango={rangos.hdl}
                  valor={entrada.hdl}
                />
              </View>
              <View className="flex-1">
                <CampoTexto
                  etiqueta="TG"
                  value={texto.tg}
                  onChangeText={(v) => setTexto((p) => ({ ...p, tg: v }))}
                  keyboardType="numeric"
                  rango={rangos.tg}
                  valor={entrada.trigliceridos}
                />
              </View>
            </View>
          </Superficie>

          {/* Las dos cifras, siempre las dos. */}
          <View className="mb-2 flex-row gap-2">
            <Cifra titulo="LDL-C" valor={r.ldl} unidad={unidad} />
            <Cifra titulo="no-HDL-C" valor={r.noHdl} unidad={unidad} />
          </View>

          {r.ldl.motivo === null ? (
            <Text className="font-mono mb-3 px-1 text-eyebrow uppercase tracking-wider text-tenue">
              Friedewald · {unidad === 'mg/dL' ? 'TC − HDL − TG/5' : 'TC − HDL − TG/2,2'}
            </Text>
          ) : (
            <PorQueNo motivo={r.ldl.motivo} faltan={faltan} algoEscrito={algoEscrito} />
          )}

          <Alternativas
            abiertas={mostrarAlternativas}
            forzadas={r.ldl.motivo === 'TG_ALTOS'}
            onAlternar={() => setAbiertas((v) => !v)}
            filas={r.alternativas}
            unidad={unidad}
          />

          <Superficie elevacion="plana" className="mt-3 px-3.5 py-3">
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              <Text className="font-medio text-ink">Qué no dice. </Text>
              Si hace falta tratar. El LDL es un factor de riesgo entre varios: la
              edad, la presión, el tabaquismo y los antecedentes pesan igual.
            </Text>
          </Superficie>

          <Text className="font-sans mt-3 px-1 text-eyebrow leading-4 text-ink-suave">
            No se guarda nada. Al salir de la herramienta, estos valores se pierden.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

/** Vacío o texto que no es número es «sin cargar», no cero. */
function aNumero(t: string): number | undefined {
  const limpio = t.replace(',', '.').trim();
  if (limpio === '') return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Una de las dos cifras.
 *
 * Apagada se pinta gris y dice «no aplica» — nunca un cero ni un guion suelto:
 * el gris de «no hay número» tiene que distinguirse de un número bajo.
 */
function Cifra({
  titulo,
  valor,
  unidad,
}: {
  titulo: string;
  valor: ValorLipidico;
  unidad: UnidadLipidos;
}) {
  const col = useColores();
  const hay = valor.valor !== null;

  return (
    <Superficie
      elevacion="plana"
      className="flex-1 px-3.5 py-3"
      style={{ borderLeftWidth: 4, borderLeftColor: hay ? col.primary : col.tenue }}
    >
      <Text className="font-mono text-eyebrow uppercase tracking-wider text-ink-suave">
        {titulo}
      </Text>
      <Text
        className="font-mono-fuerte mt-1"
        style={{
          fontSize: hay ? 25 : 21,
          color: hay ? col.primary : col.tenue,
          fontVariant: ['tabular-nums'],
        }}
      >
        {hay ? valor.valor : '—'}
      </Text>
      <Text className="font-mono mt-0.5 text-eyebrow text-tenue">
        {hay ? unidad : 'no aplica'}
      </Text>
    </Superficie>
  );
}

/**
 * Por qué no hay LDL.
 *
 * Es el punto de la pantalla: cada causa tiene su explicación, y la de datos
 * faltantes además dice cuáles. Sin esto, «no aplica» obliga a adivinar si el
 * problema es lo que escribió o lo que no.
 *
 * Va en ámbar y no en rojo: no es un hallazgo grave del paciente, es una
 * condición de la fórmula. El rojo de esta app significa gravedad clínica.
 */
function PorQueNo({
  motivo,
  faltan,
  algoEscrito,
}: {
  motivo: MotivoSinValor;
  faltan: string[];
  algoEscrito: boolean;
}) {
  const col = useColores();

  // Con la pantalla en blanco no se explica nada: no hay nada que explicar
  // todavía, y un aviso de entrada se lee como un error.
  if (motivo === 'SIN_DATO' && !algoEscrito) return null;

  const texto =
    motivo === 'SIN_DATO'
      ? `Falta ${faltan.length === 1 ? 'el dato de' : 'cargar'} ${listar(faltan)}.`
      : EXPLICACION_SIN_LDL[motivo];

  return (
    <View
      className="mb-3 flex-row rounded-card px-3.5 py-3"
      style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE9C8' }}
    >
      <Text className="font-sans flex-1 text-meta leading-5" style={{ color: '#7C4A03' }}>
        {motivo === 'TG_ALTOS' ? (
          <>
            <Text className="font-medio" style={{ color: '#5C3702' }}>
              El LDL no se puede calcular con estos triglicéridos.{' '}
            </Text>
            {texto} El no-HDL-C sí vale: no los usa.
          </>
        ) : (
          texto
        )}
      </Text>
      {/* El color no puede ser el único portador: el ícono acompaña. */}
      <View className="ml-2 pt-0.5">
        <Text style={{ color: col.tenue }}> </Text>
      </View>
    </View>
  );
}

/** «colesterol total y HDL», «HDL, triglicéridos y colesterol total». */
function listar(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? '';
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

/**
 * Las otras dos fórmulas.
 *
 * Sin ordenar por «mejor»: no lo sabemos, y un orden implicaría un juicio que
 * la app no puede sostener. Cada una con su ecuación y su año, que es lo que
 * hace la respuesta trazable.
 */
function Alternativas({
  abiertas,
  forzadas,
  onAlternar,
  filas,
  unidad,
}: {
  abiertas: boolean;
  forzadas: boolean;
  onAlternar: () => void;
  filas: ReturnType<typeof calcularLipidos>['alternativas'];
  unidad: UnidadLipidos;
}) {
  const col = useColores();

  return (
    <Superficie elevacion="plana" className="overflow-hidden">
      <Pressable
        onPress={onAlternar}
        accessibilityRole="button"
        accessibilityState={{ expanded: abiertas }}
        disabled={forzadas}
        className="flex-row items-center px-3.5 py-3"
        style={{ backgroundColor: col.paper }}
      >
        <Text className="font-sans flex-1 text-meta text-ink-suave">Otras fórmulas de LDL-C</Text>
        {!forzadas ? (
          <Text className="font-mono text-eyebrow uppercase tracking-wider" style={{ color: col.primary }}>
            {abiertas ? 'Cerrar' : 'Ver'}
          </Text>
        ) : null}
      </Pressable>

      {abiertas
        ? filas.map((f) => (
            <View
              key={f.formula.clave}
              className="flex-row items-baseline border-t border-line px-3.5 py-3"
            >
              <View className="flex-1 pr-3">
                <Text className="text-body text-ink">{f.formula.nombre}</Text>
                <Text className="font-mono mt-0.5 text-eyebrow text-tenue">
                  {f.formula.formula} · {f.formula.anio}
                </Text>
              </View>
              {f.valor !== null ? (
                <Text
                  className="font-mono-fuerte text-fila text-ink"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {f.valor}
                  <Text className="font-mono text-eyebrow text-tenue"> {unidad}</Text>
                </Text>
              ) : (
                // También acá se dice por qué, no sólo un guion.
                <Text className="font-sans max-w-[55%] text-right text-eyebrow leading-4 text-tenue">
                  {f.motivo === 'SIN_DATO'
                    ? 'faltan datos'
                    : f.motivo === 'NEGATIVO'
                      ? 'da un valor negativo'
                      : 'los valores no cierran'}
                </Text>
              )}
            </View>
          ))
        : null}
    </Superficie>
  );
}

function SelectorUnidad({
  activa,
  onElegir,
}: {
  activa: UnidadLipidos;
  onElegir: (u: UnidadLipidos) => void;
}) {
  const col = useColores();

  return (
    <View className="flex-row overflow-hidden rounded border border-line">
      {(['mg/dL', 'mmol/L'] as const).map((u, i) => (
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
            {u}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
