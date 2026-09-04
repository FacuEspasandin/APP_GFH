import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Restriccion } from '@/dominio/restricciones';
import { useFicha, usePresentaciones, useSimilares, type ClaveDetalle, type Ficha } from '@/api/ficha';
import { usePlan } from '@/api/plan';
import { cupoAgotado, gastaConsulta, rutaPaywall, textoCupo } from '@/dominio/plan-gratis';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { HojaInferior } from '@/ui/hoja-inferior';
import { Boton, Chip, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { Pestanas } from '@/ui/pestanas';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { SelloSeccion } from '@/ui/monografia';
import { GrillaRestricciones } from '@/ui/restricciones';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { colorEspina, RANGO_POR_SEVERIDAD_INTERACCION, type ClaveSeccion } from '@gfh/shared-types';

import { ContenidoSimilares } from './[id]/similares';

type Pestana = 'info' | 'ficha' | 'similares' | 'presentaciones';

/**
 * Ficha de fármaco (5.4-5.9).
 *
 * Sin pestañas. Antes eran tres —técnica, ajuste, interacciones— y el problema
 * no era la barra sino qué quedaba adentro: «Ajuste» tenía renal y hepático y
 * nada de embarazo ni lactancia, así que dos de los cuatro marcadores de
 * restricción no llevaban a ningún lado y estaban apagados a la fuerza.
 *
 * Ahora la ficha es una sola página con la grilla de restricciones arriba, y
 * cada una abre su propia pantalla. La barra de pestañas sobra: las cuatro
 * tarjetas ya dicen qué hay en cada una antes de tocarla.
 *
 * "Similares" sigue sin estar: necesita el código ATC, que no está cargado.
 */
export default function FichaFarmaco() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useFicha(id);
  const { data: plan } = usePlan();

  const textoContador = textoCupo(plan);
  const sinCupo = cupoAgotado(plan);

  // Qué pares (fármaco, herramienta) ya abrió en esta sesión. El backend no los
  // vuelve a cobrar, así que tampoco hay que advertir por ellos.
  const cache = useQueryClient();
  const yaVistas = (['embarazo', 'lactancia', 'renal', 'hepatico', 'interacciones'] as const).filter(
    (c) => cache.getQueryData(['restriccion', id, c]) !== undefined,
  );

  /** La que el médico tocó y todavía no confirmó. */
  const [porConfirmar, setPorConfirmar] = useState<ClaveDetalle | null>(null);
  const [tab, setTab] = useState<Pestana>('info');

  const ir = (clave: ClaveDetalle) => router.push(`/farmaco/${id}/${clave}` as never);

  /**
   * Con el cupo agotado se manda al paywall directo: dejar entrar para que el
   * servidor rechace mostraría medio segundo una pantalla en blanco y un error,
   * cuando lo que hay que decir es que se terminaron las consultas.
   *
   * Y si la consulta se va a gastar, se pregunta antes. Descontar en silencio
   * una de diez que no se reponen se lee como una trampa cuando el médico
   * descubre el contador en 7.
   */
  const abrir = (clave: ClaveDetalle) => {
    if (sinCupo) return router.push(rutaPaywall('consultas') as never);
    if (gastaConsulta(plan, clave, yaVistas)) return setPorConfirmar(clave);
    ir(clave);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp />
      <Pantalla>
        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={4}
        >
          {data ? (
            <>
              <Encabezado f={data} />

              <Pestanas
                pestanas={[
                  { clave: 'info', titulo: 'Info' },
                  { clave: 'ficha', titulo: 'Ficha técnica' },
                  { clave: 'similares', titulo: 'Similares' },
                  { clave: 'presentaciones', titulo: 'Presentaciones' },
                ]}
                activa={tab}
                onCambiar={setTab}
              />

              <View className="pt-4">
                {tab === 'info' ? (
                  <>
                    <AlertaCritica restricciones={data.restricciones} />

                    <TituloSeccion icono="alerta" titulo="Restricciones" />
                    <GrillaRestricciones restricciones={data.restricciones} onAbrir={abrir} />

                    <FilaInteracciones f={data} onPress={() => abrir('interacciones')} />

                    {/* El contador va debajo de las cinco puertas que lo gastan, no
                        arriba de la pantalla: es lo que se lee antes de tocar una. */}
                    {textoContador ? <Contador texto={textoContador} agotado={sinCupo} /> : null}

                    <Composicion f={data} />
                  </>
                ) : null}

                {tab === 'ficha' ? <Monografia f={data} /> : null}
                {tab === 'similares' ? <TabSimilares f={data} /> : null}
                {tab === 'presentaciones' ? <TabPresentaciones productoId={data.id} /> : null}
              </View>
            </>
          ) : null}
        </ResultadoConsulta>
      </Pantalla>

      <ConfirmarConsulta
        clave={porConfirmar}
        restantes={plan?.consultas?.restantes ?? 0}
        onCerrar={() => setPorConfirmar(null)}
        onSeguir={() => {
          const clave = porConfirmar;
          setPorConfirmar(null);
          if (clave) ir(clave);
        }}
      />
    </>
  );
}

const NOMBRE_RESTRICCION: Record<ClaveDetalle, string> = {
  embarazo: 'las alertas de embarazo',
  lactancia: 'las alertas de lactancia',
  renal: 'el ajuste renal',
  hepatico: 'el ajuste hepático',
  interacciones: 'las interacciones',
};

/**
 * Antes de gastar una de las diez.
 *
 * Se pregunta porque no se reponen: descontar en silencio y que el médico
 * descubra el contador en 7 se lee como una trampa. Dice cuántas quedan y qué
 * se lleva por esa, para que la decisión sea sobre algo concreto.
 *
 * Volver atrás no cuenta —la cuenta es por par (fármaco, herramienta)— y eso
 * también se dice acá, que es donde importa.
 */
function ConfirmarConsulta({
  clave,
  restantes,
  onCerrar,
  onSeguir,
}: {
  clave: ClaveDetalle | null;
  restantes: number;
  onCerrar: () => void;
  onSeguir: () => void;
}) {
  return (
    <HojaInferior visible={clave !== null} onCerrar={onCerrar} titulo="Consultas gratis">
      <Text className="mb-1.5 mt-1 text-fila font-fuerte text-ink">
        Ver {clave ? NOMBRE_RESTRICCION[clave] : ''} usa una de tus {restantes}
      </Text>
      <Text className="font-sans mb-4 text-meta leading-5 text-ink-suave">
        Queda abierta: volver a esta misma pantalla de este mismo fármaco no gasta otra.
      </Text>

      <Boton onPress={onSeguir}>Ver, y usar una</Boton>

      <Pressable onPress={onCerrar} accessibilityRole="button" className="items-center py-3">
        <Text className="font-medio text-meta text-ink-suave">Ahora no</Text>
      </Pressable>
    </HojaInferior>
  );
}

/**
 * Cuántas consultas quedan.
 *
 * Aparece recién cuando el backend lo pide —no desde la primera— porque un
 * contador en 1/10 convierte cada consulta en una transacción. Cuando queda
 * poco, en cambio, el dato sirve para decidir sobre cuál fármaco gastarla.
 *
 * Lleva el celeste de propiedad y no un color de la escala clínica: es un dato
 * de la cuenta, no del paciente. Pintarlo de ámbar lo pondría a competir con
 * las alertas de la misma pantalla.
 */
function Contador({ texto, agotado }: { texto: string; agotado: boolean }) {
  const col = useColores();

  return (
    <View
      className="mb-4 flex-row items-center rounded-card px-3.5 py-3"
      style={{ backgroundColor: col.primaryLight }}
    >
      <Icono nombre={agotado ? 'candado' : 'info'} tamano={15} color={col.primary} />
      <Text className="font-sans ml-2.5 flex-1 text-meta leading-5 text-ink">
        {texto}
        {agotado ? '. Con la suscripción dejás de contarlas.' : '. Volver a una que ya viste no gasta otra.'}
      </Text>
    </View>
  );
}

/** Encabezado de sección grande — más presencia que `Eyebrow` (que es un
 *  epígrafe chico), para las dos secciones largas de esta pantalla. */
function TituloSeccion({ icono, titulo }: { icono: Parameters<typeof Icono>[0]['nombre']; titulo: string }) {
  const col = useColores();
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <Icono nombre={icono} tamano={18} color={col.inkSuave} />
      <Text className="text-fila font-fuerte text-ink">{titulo}</Text>
    </View>
  );
}

/**
 * Lo peor de las cuatro restricciones, arriba de todo — sólo cuando el
 * catálogo lo AFIRMA (`evitar`), nunca por ausencia de dato. Es el mismo
 * criterio del veredicto del cockpit, aplicado acá sin paciente: esto no dice
 * "es peligroso para alguien", dice "el fármaco en sí tiene una restricción
 * fuerte" — que es un hecho de la ficha, no una inferencia.
 */
function AlertaCritica({ restricciones }: { restricciones: readonly Restriccion[] }) {
  const graves = restricciones.filter((r) => r.estado === 'evitar');
  if (graves.length === 0) return null;
  const [primera, ...resto] = graves;

  return (
    <View
      className="mb-4 flex-row gap-4 rounded-xl p-4"
      style={{ backgroundColor: '#FFDAD6' }}
    >
      <Icono nombre="alerta" tamano={20} color="#93000A" />
      <View className="flex-1">
        <Text className="text-fila font-fuerte" style={{ color: '#93000A' }}>
          {primera!.titulo}
        </Text>
        <Text className="mt-1 text-meta leading-5" style={{ color: 'rgba(147,0,10,0.9)' }}>
          {primera!.glosa}
          {resto.length > 0 ? ` Y ${resto.length} más abajo.` : ''}
        </Text>
      </View>
    </View>
  );
}

function Encabezado({ f }: { f: Ficha }) {
  const col = useColores();
  const codigosATC = [...new Set(f.principiosActivos.map((p) => p.codigoATC).filter(Boolean))] as string[];

  return (
    <Superficie elevacion="media" className="mb-4 p-5">
      <Text className="text-[28px] font-fuerte leading-9 text-ink">{f.nombreComercial}</Text>
      <Text className="mt-0.5 text-body text-ink-suave">
        {[f.dosisTexto, f.formaFarmaceutica].filter(Boolean).join(' ') || 'Sin dosis registrada'}
      </Text>
      {f.laboratorio ? (
        <Text className="mt-1 text-meta font-medio text-ink-suave">{f.laboratorio}</Text>
      ) : null}

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {f.principiosActivos.map((p) => (
          <Chip key={p.id} texto={p.nombre} />
        ))}
      </View>

      {codigosATC.length > 0 ? (
        <View className="mt-3.5 border-t border-line pt-3">
          <Text className="font-fuerte text-[11px] uppercase tracking-wider text-ink-suave">
            Código ATC
          </Text>
          <View className="mt-1.5 flex-row flex-wrap gap-1.5">
            {codigosATC.map((c) => (
              <View key={c} className="rounded px-2 py-1" style={{ backgroundColor: col.paper }}>
                <Text className="font-mono-fuerte text-meta text-ink">{c}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Superficie>
  );
}

/**
 * Las interacciones van en una fila y no en la grilla: no son una restricción
 * del fármaco contra un estado del paciente, son el fármaco contra otros
 * fármacos. Mezclarlas en las cuatro tarjetas borraría esa diferencia.
 */
function FilaInteracciones({ f, onPress }: { f: Ficha; onPress: () => void }) {
  const col = useColores();
  const { total, peorSeveridad } = f.interacciones;

  const color = peorSeveridad
    ? colorEspina(RANGO_POR_SEVERIDAD_INTERACCION[peorSeveridad])
    : col.tenue;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Interacciones, ${total}`}
      className="mb-4 flex-row items-center rounded-card border border-line bg-surface px-3.5 py-3"
    >
      <Text className="flex-1 text-fila font-medio text-ink">Interacciones</Text>
      {total > 0 ? (
        <View className="mr-2 rounded px-2 py-0.5" style={{ backgroundColor: col.paper }}>
          <Text className="font-mono-fuerte text-meta" style={{ color }}>
            {total}
          </Text>
        </View>
      ) : (
        <Text className="font-sans mr-2 text-meta text-tenue">Ninguna conocida</Text>
      )}
      <Icono nombre="chevron" tamano={15} color={col.tenue} />
    </Pressable>
  );
}

function Composicion({ f }: { f: Ficha }) {
  const router = useRouter();
  const col = useColores();
  const familias = [
    ...new Set(f.principiosActivos.map((p) => p.grupoTerapeutico).filter(Boolean)),
  ] as string[];

  return (
    <>
      <Eyebrow>Composición</Eyebrow>
      <Superficie elevacion="plana" className="mb-4">
        {f.principiosActivos.map((p, i) => {
          const fila = (
            <View className="flex-1">
              <Text className="text-body font-medio text-ink">{p.nombre}</Text>
              <Text className="font-sans text-meta text-ink-suave">
                {p.grupoTerapeutico ?? 'Sin grupo terapéutico en el catálogo'}
              </Text>
            </View>
          );
          // Sin genérico cargado para este componente, no hay a dónde llevar
          // el toque — la fila queda informativa, como antes.
          if (!p.productoGenericoId) {
            return (
              <View key={p.id} className={`px-3.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}>
                {fila}
              </View>
            );
          }
          return (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/farmaco/${p.productoGenericoId}`)}
              accessibilityRole="button"
              accessibilityLabel={`Ver ficha de ${p.nombre}`}
              className={`flex-row items-center px-3.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              {fila}
              <Icono nombre="chevron" tamano={15} color={col.tenue} />
            </Pressable>
          );
        })}
      </Superficie>

      {familias.length > 0 ? (
        <>
          <Eyebrow>Familia para alergias</Eyebrow>
          <Superficie elevacion="plana" className="mb-4 px-3.5 py-3">
            <Text className="text-body font-medio text-ink">{familias.join(' · ')}</Text>
            <Text className="font-sans mt-1 text-meta leading-4 text-ink-suave">
              Una alergia cargada a esta familia hace que el fármaco pida confirmación al agregarlo
              a un paciente. Sólo la coincidencia exacta con severidad grave bloquea.
            </Text>
          </Superficie>
        </>
      ) : null}
    </>
  );
}

/**
 * Pestaña "Similares" — sólo tiene sentido por fármaco (el ATC es del
 * componente, no del envase). En un combinado cada uno tendría su propia
 * clase, así que se pide elegir desde Composición en vez de mostrar una de
 * las dos a medias.
 */
function TabSimilares({ f }: { f: Ficha }) {
  const unicoPa = f.principiosActivos.length === 1 ? f.principiosActivos[0] : null;

  if (!unicoPa) {
    return (
      <Estado
        titulo="Es un producto combinado"
        detalle="Similares se mira por fármaco. Entrá a cada componente desde Composición, en Info."
      />
    );
  }
  return <SimilaresDelUnicoPa principioActivoId={unicoPa.id} />;
}

function SimilaresDelUnicoPa({ principioActivoId }: { principioActivoId: string }) {
  const { data, isLoading, error, refetch } = useSimilares(principioActivoId);
  return (
    <ResultadoConsulta cargando={isLoading} error={error} onReintentar={() => void refetch()} filasSkeleton={3}>
      {data ? <ContenidoSimilares s={data} /> : null}
    </ResultadoConsulta>
  );
}

/**
 * Pestaña "Presentaciones" — otras dosis/formas de la misma marca ("Klaricid
 * 500" ↔ "Klaricid 250"). Con el catálogo de hoy (631 genéricos, uno por
 * principio activo) casi siempre trae un solo elemento: se avisa en vez de
 * dejar la pestaña en blanco, que se leería como roto.
 */
function TabPresentaciones({ productoId }: { productoId: string }) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = usePresentaciones(productoId);

  return (
    <ResultadoConsulta cargando={isLoading} error={error} onReintentar={() => void refetch()} filasSkeleton={2}>
      {!data || data.length <= 1 ? (
        <Estado
          titulo="Sin otras presentaciones cargadas"
          detalle="El catálogo todavía no tiene otra dosis o forma de esta misma marca."
        />
      ) : (
        <Superficie elevacion="plana">
          {data.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => !p.actual && router.push(`/farmaco/${p.id}` as never)}
              disabled={p.actual}
              accessibilityRole="button"
              className={`flex-row items-center px-3.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <View className="flex-1">
                <Text className="text-body font-medio text-ink">
                  {[p.dosisTexto, p.formaFarmaceutica].filter(Boolean).join(' · ') || p.nombreComercial}
                </Text>
                {p.actual ? (
                  <Text className="mt-0.5 text-meta font-medio text-accent">Ésta</Text>
                ) : null}
              </View>
              {!p.actual ? <Icono nombre="chevron" tamano={15} color="#8CA39A" /> : null}
            </Pressable>
          ))}
        </Superficie>
      )}
    </ResultadoConsulta>
  );
}

/**
 * La monografía, como índice.
 *
 * No se parece a las tarjetas de arriba y no debería: aquéllas tienen estado y
 * color porque cruzan algo contra el paciente, y esto es texto. El médico
 * entra buscando una sección —posología, interacciones—, casi nunca el
 * documento entero, así que lo que sirve es un índice y no un muro.
 *
 * Sólo aparecen las secciones que tienen texto. Una sección vacía en la lista
 * haría creer que el fármaco no tiene interacciones cuando lo que pasa es que
 * no las cargamos: es la regla 5 aplicada a un índice.
 */
function Monografia({ f }: { f: Ficha }) {
  const col = useColores();
  const router = useRouter();

  // El índice es uno solo aunque el producto tenga dos componentes: se junta
  // la unión de las secciones. Adentro, cada pantalla muestra el texto de
  // todos los que la tengan, separado por nombre.
  const claves = new Map<ClaveSeccion, Ficha['monografias'][number]['secciones'][number]>();
  for (const m of f.monografias) {
    for (const sec of m.secciones) if (!claves.has(sec.clave)) claves.set(sec.clave, sec);
  }
  const secciones = [...claves.values()];

  if (secciones.length === 0) {
    return (
      <>
        <TituloSeccion icono="documento" titulo="Monografía" />
        <Superficie elevacion="plana" className="mb-4 px-3.5 py-3">
          <Text className="font-sans text-meta leading-4 text-ink-suave">
            Este fármaco todavía no tiene monografía cargada. El ajuste de dosis y las
            interacciones que sí ves salen del motor propio.
          </Text>
        </Superficie>
      </>
    );
  }

  return (
    <>
      <TituloSeccion icono="documento" titulo="Monografía" />
      <View className="mb-4 gap-2">
        {secciones.map((sec) => (
          <Pressable
            key={sec.clave}
            onPress={() => router.push(`/farmaco/${f.id}/monografia/${sec.clave}`)}
            accessibilityRole="button"
            accessibilityLabel={sec.titulo}
            className="flex-row items-center rounded-xl border px-4 py-4"
            style={{ borderColor: col.line, backgroundColor: col.surface }}
          >
            <SelloSeccion clave={sec.clave} />
            <View className="ml-3 flex-1">
              <Text className="text-fila font-medio text-ink">{sec.titulo}</Text>
              <Text className="font-sans mt-0.5 text-meta leading-4 text-ink-suave">
                {sec.glosa}
              </Text>
            </View>
            <Icono nombre="chevron" tamano={15} color={col.tenue} />
          </Pressable>
        ))}
      </View>
    </>
  );
}
