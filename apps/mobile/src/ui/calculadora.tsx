import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Anillo } from '@/ui/anillo';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Icono } from '@/ui/iconos';
import { CampoTexto, Chip } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import {
  completo,
  contestado,
  COLOR_SEVERIDAD,
  cuantosContestados,
  puntajeMaximo,
  puntajeParcial,
  textoDeFaltantes,
  tramoDe,
  type Borrador,
  type Campo,
  type Molde,
  type Tramo,
} from '@gfh/shared-types';

/**
 * La pantalla de cualquier calculadora, dibujada desde su declaración.
 *
 * Clcr y Child-Pugh hacían lo mismo y estaban escritas a mano cada una por su
 * lado, con cuatro decisiones clínicas tomadas dos veces y distinto. Acá esas
 * cuatro se toman una vez: dónde va el aviso de que no se guarda nada, que la
 * fórmula se nombra pegada al resultado, qué se muestra cuando falta un dato, y
 * que el límite —«qué no dice este número»— es obligatorio.
 *
 * El molde vive en `@gfh/shared-types`; esto es sólo cómo se ve.
 *
 * **No llama al backend.** El cálculo es puro y corre en el teléfono: pedirle a
 * la red que divida dos números agregaría una espera y un modo de fallo por
 * nada, y dejaría la calculadora inservible sin señal. Lo que sí cruza el
 * catálogo —cuánto ajustar CADA fármaco— no entra en este molde: es otro
 * problema y tiene su propia pantalla.
 */

/**
 * Lo que la calculadora sabe hacer con lo escrito.
 *
 * Devuelve las cifras por clave. `null` en una cifra es «con estos datos no
 * sale» —falta algo, o el valor rompe la fórmula— y se pinta gris, nunca cero:
 * un cero se lee como un resultado y la regla 5 dice no inferir nada sin dato.
 *
 * Las de puntaje no la necesitan: el puntaje sale de los puntos declarados.
 */
export type Calculo = (b: Borrador) => Record<string, number | null>;

export function Calculadora({ molde, calcular }: { molde: Molde; calcular?: Calculo }) {
  const [borrador, setBorrador] = useState<Borrador>({});
  /** La que el médico abrió para corregir. Gana sobre la primera sin contestar. */
  const [abiertaAMano, setAbiertaAMano] = useState<string | null>(null);

  const responder = (clave: string, valor: string) => {
    setBorrador((p) => ({ ...p, [clave]: valor }));
    // Contestar la que se estaba corrigiendo la cierra; si no, quedaría abierta
    // para siempre y la cascada dejaría de avanzar.
    setAbiertaAMano(null);
  };

  const cuerpo =
    molde.modo === 'cascada' ? (
      <EnCascada
        molde={molde}
        borrador={borrador}
        abiertaAMano={abiertaAMano}
        onAbrir={setAbiertaAMano}
        onResponder={responder}
      />
    ) : (
      <BloqueFormulario titulo="Datos" exigencia="Obligatorio">
        {molde.campos.map((c) => (
          <CampoDelMolde
            key={c.clave}
            campo={c}
            valor={borrador[c.clave]}
            onChange={(v) => responder(c.clave, v)}
          />
        ))}
      </BloqueFormulario>
    );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-4 pb-8 pt-3" keyboardShouldPersistTaps="handled">
        {cuerpo}

        <Resultado molde={molde} borrador={borrador} calcular={calcular} />

        {/* Obligatorio en el molde: es la línea que hoy cada calculadora escribe
            a su manera o no escribe. */}
        <Superficie elevacion="plana" className="px-3.5 py-3">
          <Text className="font-sans text-meta leading-5 text-ink-suave">
            <Text className="font-medio text-ink">Qué no dice. </Text>
            {molde.limite}
          </Text>
        </Superficie>

        <Text className="font-sans mt-3 px-1 text-eyebrow leading-4 text-ink-suave">
          No se guarda nada. Al salir de la herramienta, estos valores se pierden.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// La cascada
// ---------------------------------------------------------------------------

/**
 * De a una pregunta.
 *
 * Las tres reglas, que son las de `dominio/cascada.ts` y ahora valen para
 * cualquier calculadora declarada así:
 *
 *   1. Se abre la primera sin contestar, salvo que el médico haya tocado una ya
 *      contestada para corregirla — ésa gana siempre.
 *   2. Corregir una del medio abre ESA y ninguna más.
 *   3. Lo contestado se pliega a un renglón. Si se quedara como tarjeta, a la
 *      séptima hay siete tarjetas y volvimos al scroll que la cascada vino a
 *      sacar.
 */
function EnCascada({
  molde,
  borrador,
  abiertaAMano,
  onAbrir,
  onResponder,
}: {
  molde: Molde;
  borrador: Borrador;
  abiertaAMano: string | null;
  onAbrir: (clave: string) => void;
  onResponder: (clave: string, valor: string) => void;
}) {
  const col = useColores();
  const sinContestar = molde.campos.find((c) => !contestado(borrador, c.clave));
  const abierta = abiertaAMano ?? sinContestar?.clave ?? null;

  /** La de abajo, apagada, como anticipo. Sólo yendo hacia adelante: corrigiendo
   *  una del medio, el anticipo diría que falta algo que ya está contestado. */
  const siguiente =
    abiertaAMano !== null || abierta === null
      ? null
      : molde.campos
          .slice(molde.campos.findIndex((c) => c.clave === abierta) + 1)
          .find((c) => !contestado(borrador, c.clave));

  const hechos = cuantosContestados(molde.campos, borrador);

  return (
    <>
      <View className="mb-3 flex-row items-center gap-2">
        {molde.campos.map((c) => (
          <View
            key={c.clave}
            className="h-1 flex-1 rounded-full"
            style={{
              backgroundColor: contestado(borrador, c.clave) ? col.primary : col.line,
            }}
          />
        ))}
        <Text className="font-mono-fuerte text-eyebrow text-ink-suave">
          {hechos} / {molde.campos.length}
        </Text>
      </View>

      {molde.campos.map((campo) => {
        if (campo.clave === abierta) {
          return (
            <Superficie
              key={campo.clave}
              elevacion="plana"
              className="mb-2.5 px-3.5 py-3.5"
              style={{ borderColor: col.primary, borderWidth: 1.5 }}
            >
              {abiertaAMano === campo.clave ? (
                <Text
                  className="mb-1.5 text-eyebrow font-medio uppercase tracking-wider"
                  style={{ color: col.primary }}
                >
                  Corrigiendo
                </Text>
              ) : null}
              <Text className="text-grande font-fuerte text-ink">{campo.rotulo}</Text>
              {campo.ayuda ? (
                <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">
                  {campo.ayuda}
                </Text>
              ) : null}
              <View className="mt-3">
                <CampoDelMolde
                  campo={campo}
                  valor={borrador[campo.clave]}
                  onChange={(v) => onResponder(campo.clave, v)}
                  sinRotulo
                />
              </View>
            </Superficie>
          );
        }

        if (!contestado(borrador, campo.clave)) return null;

        return (
          <Plegado
            key={campo.clave}
            campo={campo}
            valor={borrador[campo.clave]!}
            onPress={() => onAbrir(campo.clave)}
          />
        );
      })}

      {siguiente ? (
        <View className="mb-2.5 rounded-card border border-dashed border-line px-3.5 py-3">
          <Text className="font-sans text-meta text-ink-suave">Después: {siguiente.rotulo}</Text>
        </View>
      ) : null}
    </>
  );
}

/** Una contestada: un renglón con el valor a la derecha, tocable para corregir. */
function Plegado({
  campo,
  valor,
  onPress,
}: {
  campo: Campo;
  valor: string;
  onPress: () => void;
}) {
  const col = useColores();
  const etiqueta =
    campo.tipo === 'opcion'
      ? (campo.opciones.find((o) => o.valor === valor)?.etiqueta ?? valor)
      : `${valor} ${campo.unidad}`;
  const puntos =
    campo.tipo === 'opcion'
      ? campo.opciones.find((o) => o.valor === valor)?.puntos
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Corregir ${campo.rotulo}`}
      className="mb-2 flex-row items-center rounded-card border border-line bg-surface px-3.5 py-2.5"
    >
      <Icono nombre="check" tamano={14} color={col.primary} />
      <Text className="font-sans ml-2.5 flex-1 text-meta text-ink-suave" numberOfLines={1}>
        {campo.rotulo}
      </Text>
      <Text className="text-meta font-medio text-ink">
        {etiqueta}
        {puntos ? ` · +${puntos}` : ''}
      </Text>
      <Text className="ml-2 text-meta text-ink-suave">✎</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Los campos
// ---------------------------------------------------------------------------

function CampoDelMolde({
  campo,
  valor,
  onChange,
  sinRotulo = false,
}: {
  campo: Campo;
  valor: string | undefined;
  onChange: (v: string) => void;
  sinRotulo?: boolean;
}) {
  if (campo.tipo === 'numero') {
    return (
      <CampoTexto
        etiqueta={sinRotulo ? '' : campo.rotulo}
        value={valor ?? ''}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={campo.unidad}
        rango={campo.rango}
        valor={numero(valor)}
      />
    );
  }

  return (
    <View>
      {sinRotulo ? null : (
        <Text className="mb-1.5 text-eyebrow font-medio uppercase tracking-wider text-ink-suave">
          {campo.rotulo}
        </Text>
      )}
      <View className="mb-3 flex-row flex-wrap gap-2">
        {campo.opciones.map((o) => (
          <Chip
            key={o.valor}
            texto={o.etiqueta}
            activo={valor === o.valor}
            onPress={() => onChange(o.valor)}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// El resultado
// ---------------------------------------------------------------------------

function Resultado({
  molde,
  borrador,
  calcular,
}: {
  molde: Molde;
  borrador: Borrador;
  calcular?: Calculo;
}) {
  const r = molde.resultado;
  const todo = completo(molde.campos, borrador);
  const falta = textoDeFaltantes(molde.campos, borrador);
  const cifras = calcular?.(borrador) ?? {};

  /**
   * El tramo se muestra sólo con todo contestado.
   *
   * El puntaje parcial sí se muestra —es lo que hace que la cascada no se sienta
   * un cuestionario a ciegas— pero cuatro de nueve con tres criterios sin
   * contestar no es «riesgo alto» ni «riesgo bajo». Decir un tramo sobre un
   * puntaje incompleto sería inventar. Regla 5.
   */
  const tramoDeValor = (valor: number | null): Tramo | null =>
    !todo || valor === null || r.tipo === 'cifras' ? null : tramoDe(r.tramos, valor);

  if (r.tipo === 'puntaje') {
    const puntos = puntajeParcial(molde.campos, borrador);
    const max = r.maximo || puntajeMaximo(molde.campos);
    const tramo = tramoDeValor(puntos);
    const color = tramo?.color ? COLOR_SEVERIDAD[tramo.color] : COLOR_SEVERIDAD.neutro;

    return (
      <Superficie
        elevacion="plana"
        className="mb-3.5 px-3.5 py-3.5"
        style={{ borderLeftWidth: 4, borderLeftColor: color }}
      >
        <View className="flex-row items-baseline">
          <Text
            className="font-mono-fuerte text-titulo"
            style={{ color: todo ? color : undefined, fontVariant: ['tabular-nums'] }}
          >
            {puntos}
          </Text>
          <Text className="font-mono ml-3 text-meta text-ink-suave">de {max} puntos</Text>
        </View>

        {tramo ? (
          <Text className="mt-1.5 text-body font-fuerte" style={{ color }}>
            {tramo.rotulo}
          </Text>
        ) : (
          <Text className="font-sans mt-1.5 text-meta text-ink-suave">
            {falta ?? 'sin tramo declarado para este puntaje'}
          </Text>
        )}

        <Text className="font-sans mt-2 text-eyebrow text-ink-suave">{molde.formula}</Text>
      </Superficie>
    );
  }

  if (r.tipo === 'anillo') {
    const valor = cifras.valor ?? null;
    const tramo = tramoDeValor(valor);
    return (
      <Superficie elevacion="plana" className="mb-3.5 items-center px-3.5 py-4">
        <Anillo
          valor={valor}
          maximo={r.maximo}
          color={tramo?.color ? COLOR_SEVERIDAD[tramo.color] : COLOR_SEVERIDAD.neutro}
          sufijo={r.unidad}
          insignia={tramo?.rotulo ?? null}
          tamano={132}
        />
        <Text className="font-sans mt-2.5 text-center text-meta leading-5 text-ink-suave">
          {valor === null ? (falta ?? 'con estos datos no sale') : molde.formula}
        </Text>
      </Superficie>
    );
  }

  return (
    <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3.5">
      {r.cifras.map((c, i) => {
        const v = cifras[c.clave] ?? null;
        return (
          <View
            key={c.clave}
            className={`flex-row items-baseline ${i > 0 ? 'mt-2.5 border-t border-line pt-2.5' : ''}`}
          >
            <Text
              className="font-mono-fuerte text-titulo"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {v ?? '—'}
            </Text>
            <Text className="font-sans ml-3 flex-1 text-meta text-ink-suave">
              {c.rotulo} · {c.unidad}
            </Text>
          </View>
        );
      })}
      <Text className="font-sans mt-2 text-eyebrow text-ink-suave">
        {falta ?? molde.formula}
      </Text>
    </Superficie>
  );
}

/** Vacío o texto que no es número es «sin cargar», no cero. Con coma: el teclado
 *  de un teléfono en español la ofrece. */
function numero(v: string | undefined): number | undefined {
  if (v === undefined || v.trim() === '') return undefined;
  const n = Number(v.replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
}
