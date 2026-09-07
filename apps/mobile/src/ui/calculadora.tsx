import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Anillo } from '@/ui/anillo';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Icono } from '@/ui/iconos';
import { Boton, CampoTexto, Chip } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import {
  completo,
  contestado,
  COLOR_SEVERIDAD,
  cuantosContestados,
  puntajeMaximo,
  puntajeParcial,
  opcionesDe,
  rangoDe,
  textoDeFaltantes,
  tramoDe,
  unidadDe,
  type Borrador,
  type Campo,
  type ClaveColorSeveridad,
  type Molde,
  type Unidades,
  type Tramo,
} from '@gfh/shared-types';

/**
 * El color de un tramo, que puede venir de la escala clínica (una clave de
 * `COLOR_SEVERIDAD`) o —desde que existe el riesgo cardiovascular WHO/ISH,
 * con sus 5 niveles propios— un hex literal. Un mismo campo con dos formas
 * posibles porque forzar 5 niveles ajenos a la escala clínica de 3-4 le
 * pondría un significado clínico a un color que no lo tiene.
 */
function resolverColorTramo(color: string | undefined): string {
  if (!color) return COLOR_SEVERIDAD.neutro;
  return color in COLOR_SEVERIDAD ? COLOR_SEVERIDAD[color as ClaveColorSeveridad] : color;
}

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
 * Una cifra calculada, o la explicación de por qué no salió.
 *
 * `null` se pinta gris, nunca cero: un cero se lee como un resultado y la regla
 * 5 dice no inferir nada sin dato.
 *
 * `porQueNo` es lo que separa «todavía no escribiste» de «con estos datos la
 * fórmula no aplica» —triglicéridos sobre 400, un HDL mayor que el colesterol
 * total—. Los dos daban el mismo gris y son cosas distintas: uno se resuelve
 * escribiendo y el otro corrigiendo. Sin esta línea el médico no sabe cuál de
 * las dos le pasó.
 */
export interface Cifra {
  valor: number | null;
  porQueNo?: string;
}

/**
 * Lo que la calculadora sabe hacer con lo escrito.
 *
 * Recibe las unidades elegidas y no los valores ya convertidos: la conversión
 * la hace la función pura, que ya sabe. Convertir en la pantalla sería una
 * segunda implementación de algo que `lipidos.ts` y `child-pugh.ts` resuelven.
 *
 * Las de puntaje no la necesitan: el puntaje sale de los puntos declarados.
 */
export type Calculo = (b: Borrador, unidades: Unidades) => Record<string, Cifra>;

export function Calculadora({
  molde,
  calcular,
  inicial,
  onCambio,
  guardar,
  extra,
}: {
  molde: Molde;
  calcular?: Calculo;
  /** Con qué arranca. La pantalla del paciente trae lo que ya estaba guardado. */
  inicial?: Borrador;
  /**
   * Avisa hacia afuera en cada cambio, para que la pantalla pueda guardar.
   *
   * Entrega también las unidades elegidas: sin ellas el valor exacto no se
   * puede convertir, porque 2 no significa lo mismo en mg/dL que en µmol/L.
   */
  onCambio?: (b: Borrador, u: Unidades) => void;
  /**
   * Cuando existe, la calculadora guarda: el pie cambia de «no se guarda nada»
   * a un botón. Sin esto es descartable, que es lo que son las herramientas
   * sueltas.
   */
  guardar?: { rotulo: string; onGuardar: () => void; guardando?: boolean; listo?: boolean };
  /**
   * Lo que la pantalla necesita y el molde no declara: la fecha del análisis,
   * una nota de contexto. Va entre el límite y el pie.
   *
   * Existe para que el molde no crezca con campos que sirven a una sola
   * calculadora. Si algo de acá aparece en la tercera, ahí sí conviene
   * declararlo.
   */
  extra?: ReactNode;
}) {
  const [borrador, setBorrador] = useState<Borrador>(inicial ?? {});
  const [unidades, setUnidades] = useState<Unidades>({});
  /** La que el médico abrió para corregir. Gana sobre la primera sin contestar. */
  const [abiertaAMano, setAbiertaAMano] = useState<string | null>(null);

  const responder = (clave: string, valor: string) => {
    setBorrador((p) => {
      const siguiente = { ...p, [clave]: valor };
      onCambio?.(siguiente, unidades);
      return siguiente;
    });
    // Contestar la que se estaba corrigiendo la cierra; si no, quedaría abierta
    // para siempre y la cascada dejaría de avanzar.
    setAbiertaAMano(null);
  };

  /* Cambiar de unidad no toca lo contestado. En las bandas es la misma banda
     con otro rótulo, y en los números el valor escrito sigue siendo el que el
     médico leyó del análisis — reinterpretarlo solo sería cambiarle el dato. */
  /* El valor exacto vive en el mismo borrador, con la clave del campo más
     `:exacto`, y no en un estado aparte: así `onCambio` entrega todo junto y
     la pantalla que guarda no tiene que juntar dos piezas. `puntajeParcial`
     nunca lo mira, porque sólo suma campos declarados. */
  const responderExacto = (clave: string, valor: string) =>
    setBorrador((p) => {
      const siguiente = { ...p, [clave + ':exacto']: valor };
      onCambio?.(siguiente, unidades);
      return siguiente;
    });

  const cambiarUnidad = (clave: string, unidad: string) =>
    setUnidades((p) => {
      const siguiente = { ...p, [clave]: unidad };
      // También avisa: cambiar de unidad no toca lo contestado, pero sí cambia
      // cómo se interpreta el valor exacto que ya esté escrito.
      onCambio?.(borrador, siguiente);
      return siguiente;
    });

  const cuerpo =
    molde.modo === 'cascada' ? (
      <EnCascada
        molde={molde}
        borrador={borrador}
        unidades={unidades}
        abiertaAMano={abiertaAMano}
        onAbrir={setAbiertaAMano}
        onResponder={responder}
        onUnidad={cambiarUnidad}
        onValorExacto={responderExacto}
      />
    ) : (
      <BloqueFormulario titulo="Datos" exigencia="Obligatorio">
        {molde.campos.map((c) => (
          <CampoDelMolde
            key={c.clave}
            campo={c}
            valor={borrador[c.clave]}
            valorExacto={borrador[c.clave + ':exacto']}
            unidades={unidades}
            onChange={(v) => responder(c.clave, v)}
            onUnidad={(u) => cambiarUnidad(c.clave, u)}
            onValorExacto={(v) => responderExacto(c.clave, v)}
          />
        ))}
      </BloqueFormulario>
    );

  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="px-4 pb-8 pt-3" keyboardShouldPersistTaps="handled">
        {cuerpo}

        <Resultado molde={molde} borrador={borrador} unidades={unidades} calcular={calcular} />

        {/* Obligatorio en el molde: es la línea que hoy cada calculadora escribe
            a su manera o no escribe. */}
        <Superficie elevacion="plana" className="px-3.5 py-3">
          <Text className="font-sans text-meta leading-5 text-ink-suave">
            <Text className="font-medio text-ink">Qué no dice. </Text>
            {molde.limite}
          </Text>
        </Superficie>

        {extra}

        {/* Guardar o descartar: no hay un tercer caso, y decir las dos cosas
            —un botón Y un cartel de que no se guarda— sería contradecirse. */}
        {guardar ? (
          <View className="mt-4">
            <Boton
              onPress={guardar.onGuardar}
              cargando={guardar.guardando}
              deshabilitado={guardar.listo === false}
            >
              {guardar.rotulo}
            </Boton>
          </View>
        ) : (
          <Text className="font-sans mt-3 px-1 text-eyebrow leading-4 text-ink-suave">
            No se guarda nada. Al salir de la herramienta, estos valores se pierden.
          </Text>
        )}
      </ScrollView>
    </View>
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
  unidades,
  abiertaAMano,
  onAbrir,
  onResponder,
  onUnidad,
  onValorExacto,
}: {
  molde: Molde;
  borrador: Borrador;
  unidades: Unidades;
  abiertaAMano: string | null;
  onAbrir: (clave: string) => void;
  onResponder: (clave: string, valor: string) => void;
  onUnidad: (clave: string, unidad: string) => void;
  onValorExacto: (clave: string, valor: string) => void;
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
                  className="mb-1.5 text-eyebrow font-fuerte uppercase tracking-wider"
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
                  valorExacto={borrador[campo.clave + ':exacto']}
                  unidades={unidades}
                  onChange={(v) => onResponder(campo.clave, v)}
                  onUnidad={(u) => onUnidad(campo.clave, u)}
                  onValorExacto={(v) => onValorExacto(campo.clave, v)}
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
            unidades={unidades}
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
  unidades,
  onPress,
}: {
  campo: Campo;
  valor: string;
  unidades: Unidades;
  onPress: () => void;
}) {
  const col = useColores();
  // La etiqueta sale de la unidad activa —«2 – 3» o «34 – 50»— pero los puntos
  // salen siempre de `opciones`: la banda vale lo mismo se escriba como se
  // escriba.
  const etiqueta =
    campo.tipo === 'opcion'
      ? (opcionesDe(campo, unidades).find((o) => o.valor === valor)?.etiqueta ?? valor)
      : `${valor} ${unidadDe(campo, unidades)}`;
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
  valorExacto,
  unidades,
  onChange,
  onUnidad,
  onValorExacto,
  sinRotulo = false,
}: {
  campo: Campo;
  valor: string | undefined;
  valorExacto?: string | undefined;
  unidades: Unidades;
  onChange: (v: string) => void;
  onUnidad: (u: string) => void;
  onValorExacto?: (v: string) => void;
  sinRotulo?: boolean;
}) {
  const activa = unidadDe(campo, unidades);

  /* El selector de unidad va arriba del campo y no adentro: adentro compite con
     el valor por el mismo renglón, y con la letra del sistema agrandada el
     número deja de entrar. */
  const selector = campo.unidades ? (
    <View className="mb-2 flex-row gap-2">
      {campo.unidades.map((u) => (
        <Chip
          key={u.valor}
          texto={u.etiqueta}
          activo={activa === u.valor}
          onPress={() => onUnidad(u.valor)}
        />
      ))}
    </View>
  ) : null;

  if (campo.tipo === 'numero') {
    return (
      <View>
        {selector}
        <CampoTexto
          etiqueta={sinRotulo ? '' : campo.rotulo}
          value={valor ?? ''}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder={activa}
          rango={rangoDe(campo, unidades)}
          valor={numero(valor)}
        />
      </View>
    );
  }

  return (
    <View>
      {sinRotulo ? null : (
        <Text className="mb-1.5 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
          {campo.rotulo}
        </Text>
      )}
      {selector}
      <View className="mb-3 flex-row flex-wrap gap-2">
        {opcionesDe(campo, unidades).map((o) => (
          <Chip
            key={o.valor}
            texto={o.etiqueta}
            activo={valor === o.valor}
            onPress={() => onChange(o.valor)}
          />
        ))}
      </View>

      {/* El número exacto, si el molde lo pide. Va DEBAJO de las bandas y no
          arriba: la banda es la que decide, y ponerlo primero invitaría a
          escribir el número esperando que clasifique solo — que es justo lo
          que esta pantalla dejó de hacer. */}
      {campo.valorExacto ? (
        <View className="mb-1">
          <CampoTexto
            etiqueta={campo.valorExacto.rotulo}
            value={valorExacto ?? ''}
            onChangeText={(v) => onValorExacto?.(v)}
            keyboardType="numeric"
            placeholder="opcional"
            rango={campo.valorExacto.rangoPorUnidad?.[activa] ?? campo.valorExacto.rango}
            valor={numero(valorExacto)}
          />
          <Text className="font-sans -mt-2 mb-3 px-1 text-eyebrow leading-4 text-ink-suave">
            No cambia el puntaje — la banda de arriba es la que cuenta. Queda
            anotado para el historial.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// El resultado
// ---------------------------------------------------------------------------

function Resultado({
  molde,
  borrador,
  unidades,
  calcular,
}: {
  molde: Molde;
  borrador: Borrador;
  unidades: Unidades;
  calcular?: Calculo;
}) {
  const r = molde.resultado;
  const todo = completo(molde.campos, borrador);
  const falta = textoDeFaltantes(molde.campos, borrador);
  const cifras = calcular?.(borrador, unidades) ?? {};

  /**
   * Qué decir cuando no hay número.
   *
   * El motivo gana sobre «falta tal cosa»: si la fórmula no aplica, decirle al
   * médico que complete un campo lo manda a hacer algo que no va a arreglar
   * nada. Un valor rechazado y un campo vacío daban el mismo gris.
   */
  const porQueNoHay = (c: Cifra | undefined): string =>
    c?.porQueNo ?? falta ?? 'con estos datos no sale';

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
    /*
     * Sin nada contestado no se muestra un cero.
     *
     * El parcial de un puntaje vacío da 0, y en escalas cuyo piso no es cero
     * —Child-Pugh arranca en 5, porque cada criterio suma al menos uno— un 0
     * es un valor que no existe. Se lee como un resultado y no lo es. Con al
     * menos un criterio contestado el parcial ya significa algo.
     */
    const empezado = cuantosContestados(molde.campos, borrador) > 0;
    const max = r.maximo || puntajeMaximo(molde.campos);
    const tramo = tramoDeValor(puntos);
    const color = resolverColorTramo(tramo?.color);

    return (
      <Superficie
        elevacion="plana"
        className="mb-3.5 px-3.5 py-3.5"
        style={{ borderLeftWidth: 4, borderLeftColor: color }}
      >
        <View className="flex-row items-baseline">
          <Text
            className="font-mono-fuerte text-titulo"
            style={{
              color: todo ? color : empezado ? undefined : COLOR_SEVERIDAD.neutro,
              fontVariant: ['tabular-nums'],
            }}
          >
            {empezado ? puntos : '—'}
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
    const cifra = cifras.valor;
    const valor = cifra?.valor ?? null;
    const tramo = tramoDeValor(valor);
    return (
      <Superficie elevacion="plana" className="mb-3.5 items-center px-3.5 py-4">
        <Anillo
          valor={valor}
          maximo={r.maximo}
          color={resolverColorTramo(tramo?.color)}
          sufijo={r.unidad}
          insignia={tramo?.rotulo ?? null}
          tamano={132}
        />
        <Text className="font-sans mt-2.5 text-center text-meta leading-5 text-ink-suave">
          {valor === null ? porQueNoHay(cifra) : molde.formula}
        </Text>
      </Superficie>
    );
  }

  if (r.tipo === 'categoria') {
    const cifra = cifras.valor;
    const valor = cifra?.valor ?? null;
    const tramo = tramoDeValor(valor);
    const color = resolverColorTramo(tramo?.color);

    return (
      <Superficie
        elevacion="plana"
        className="mb-3.5 items-center px-3.5 py-5"
        style={{ borderLeftWidth: 4, borderLeftColor: color }}
      >
        {tramo ? (
          <>
            <Text className="font-mono-fuerte text-titulo" style={{ color }}>
              {tramo.rotulo}
            </Text>
            <Text className="font-sans mt-2 text-center text-meta leading-5 text-ink-suave">
              {molde.formula}
            </Text>
          </>
        ) : (
          <Text className="font-sans text-center text-meta text-ink-suave">
            {valor === null ? porQueNoHay(cifra) : 'sin tramo declarado para este valor'}
          </Text>
        )}
      </Superficie>
    );
  }

  return (
    <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3.5">
      {r.cifras.map((c, i) => {
        const cifra = cifras[c.clave];
        const v = cifra?.valor ?? null;
        return (
          <View
            key={c.clave}
            className={i > 0 ? 'mt-2.5 border-t border-line pt-2.5' : ''}
          >
            <View className="flex-row items-baseline">
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
            {/* El motivo va por cifra y no al pie: con dos resultados, una puede
                salir y la otra no —el no-HDL no necesita triglicéridos y el LDL
                sí— y un solo renglón abajo no diría de cuál habla. */}
            {v === null ? (
              <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">
                {porQueNoHay(cifra)}
              </Text>
            ) : null}
          </View>
        );
      })}
      <Text className="font-sans mt-2.5 text-eyebrow text-ink-suave">{molde.formula}</Text>
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
