import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useFicha, type ClaveDetalle, type Ficha } from '@/api/ficha';
import { usePlan } from '@/api/plan';
import { cupoAgotado, gastaConsulta, rutaPaywall, textoCupo } from '@/dominio/plan-gratis';
import { Icono } from '@/ui/iconos';
import { HojaInferior } from '@/ui/hoja-inferior';
import { Boton, Chip, Eyebrow, Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { GrillaRestricciones } from '@/ui/restricciones';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { colorEspina, RANGO_POR_SEVERIDAD_INTERACCION } from '@gfh/shared-types';

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
      <Stack.Screen options={{ title: data?.nombreComercial ?? 'Fármaco' }} />
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

              <Eyebrow>Restricciones</Eyebrow>
              <GrillaRestricciones restricciones={data.restricciones} onAbrir={abrir} />

              <FilaInteracciones f={data} onPress={() => abrir('interacciones')} />

              {/* El contador va debajo de las cinco puertas que lo gastan, no
                  arriba de la pantalla: es lo que se lee antes de tocar una. */}
              {textoContador ? <Contador texto={textoContador} agotado={sinCupo} /> : null}

              <Composicion f={data} />
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

function Encabezado({ f }: { f: Ficha }) {
  return (
    <View className="mb-3.5 rounded-card bg-primary-light px-3.5 py-3.5">
      <Text className="text-grande font-fuerte text-ink">
        {f.nombreComercial}
        {f.dosisTexto ? <Text className="font-sans text-ink-suave"> {f.dosisTexto}</Text> : null}
      </Text>
      <Text className="font-sans mt-1 text-meta text-ink-suave">
        {[f.formaFarmaceutica, f.laboratorio].filter(Boolean).join(' · ') ||
          'Sin datos de presentación'}
      </Text>
      <View className="mt-2.5 flex-row flex-wrap gap-1.5">
        {f.principiosActivos.map((p) => (
          <Chip key={p.id} texto={p.nombre} />
        ))}
      </View>
    </View>
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
  const familias = [
    ...new Set(f.principiosActivos.map((p) => p.grupoTerapeutico).filter(Boolean)),
  ] as string[];

  return (
    <>
      <Eyebrow>Composición</Eyebrow>
      <Superficie elevacion="plana" className="mb-4">
        {f.principiosActivos.map((p, i) => (
          <View key={p.id} className={`px-3.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}>
            <Text className="text-body font-medio text-ink">{p.nombre}</Text>
            <Text className="font-sans text-meta text-ink-suave">
              {p.grupoTerapeutico ?? 'Sin grupo terapéutico en el catálogo'}
            </Text>
          </View>
        ))}
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

      <Eyebrow>Monografía</Eyebrow>
      <Superficie elevacion="plana" className="mb-4 px-3.5 py-3">
        <Text className="font-sans text-meta leading-4 text-ink-suave">
          La ficha descriptiva todavía no está conectada. El ajuste de dosis y las interacciones
          que sí ves salen del motor propio.
        </Text>
      </Superficie>
    </>
  );
}
