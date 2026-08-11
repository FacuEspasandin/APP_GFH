import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { Chip, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { Pestanas, type Pestana } from '@/ui/pestanas';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import {
  colorEspina,
  COLOR_SEVERIDAD,
  RANGO_ETIQUETA,
  RANGO_POR_SEVERIDAD_INTERACCION,
  type RangoGravedad,
  type SeveridadInteraccion,
} from '@gfh/shared-types';

interface Ficha {
  id: string;
  nombreComercial: string;
  esGenerico: boolean;
  laboratorio: string | null;
  formaFarmaceutica: string | null;
  dosisTexto: string | null;
  principiosActivos: Array<{
    id: string;
    nombre: string;
    grupoTerapeutico: string | null;
    codigoATC: string | null;
  }>;
  tieneAjusteRenal: boolean;
  tieneAjusteHepatico: boolean;
  tablasRenales: Array<{
    principioActivo: string;
    via: string;
    dosisFrNormal: string;
    suplementoHd: string | null;
    requiereRevision: boolean;
    rangos: Array<{ rangoTexto: string; textoRecomendacion: string | null; tipo: string }>;
  }>;
  interaccionesConocidas: Array<{ conNombre: string; severidad: SeveridadInteraccion; texto: string }>;
  monografia: null;
}

type Seccion = 'tecnica' | 'ajuste' | 'interacciones';

/**
 * Ficha de fármaco (5.4-5.9), en tres pestañas.
 *
 * Por qué pestañas y no un scroll único: las interacciones no tienen techo —un
 * fármaco puede tener treinta— y en una sola página entierran la tabla de
 * dosis, que es el dato que se vino a buscar. Cada sección crece hacia abajo
 * sin empujar a las otras.
 *
 * "Similares" no está: necesita el código ATC, que no está cargado en el
 * catálogo. Una pestaña que sólo dice "todavía no" enseña a no tocar la barra.
 */
export default function FichaFarmaco() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [seccion, setSeccion] = useState<Seccion>('tecnica');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ficha', id],
    queryFn: () => api.get<Ficha>(`/catalogo/productos/${id}`),
    enabled: Boolean(id),
  });

  const pestanas: readonly Pestana<Seccion>[] = [
    { clave: 'tecnica', titulo: 'Ficha técnica' },
    { clave: 'ajuste', titulo: 'Ajuste', conteo: data?.tablasRenales.length ?? null },
    {
      clave: 'interacciones',
      titulo: 'Interacciones',
      conteo: data?.interaccionesConocidas.length ?? null,
    },
  ];

  return (
    <>
      <Stack.Screen options={{ title: data?.nombreComercial ?? 'Fármaco' }} />

      {/* La barra se dibuja aunque la ficha esté cargando: si apareciera recién
          con los datos, la pantalla saltaría 44px hacia abajo al llegar. */}
      <View className="flex-1 bg-paper">
        <Pestanas pestanas={pestanas} activa={seccion} onCambiar={setSeccion} />

        <Pantalla>
          <ResultadoConsulta
            cargando={isLoading}
            error={error}
            onReintentar={() => void refetch()}
            filasSkeleton={4}
          >
            {data ? (
              <>
                {seccion === 'tecnica' ? <FichaTecnica f={data} /> : null}
                {seccion === 'ajuste' ? <Ajuste f={data} /> : null}
                {seccion === 'interacciones' ? <Interacciones f={data} /> : null}
              </>
            ) : null}
          </ResultadoConsulta>
        </Pantalla>
      </View>
    </>
  );
}

// --- pestaña 1 --------------------------------------------------------------

function FichaTecnica({ f }: { f: Ficha }) {
  const familias = [
    ...new Set(f.principiosActivos.map((p) => p.grupoTerapeutico).filter(Boolean)),
  ] as string[];

  return (
    <>
      <View className="mb-3.5 rounded-card bg-primary-light px-3.5 py-3.5">
        <Text className="text-grande font-fuerte text-ink">
          {f.nombreComercial}
          {f.dosisTexto ? (
            <Text className="font-sans text-ink-suave"> {f.dosisTexto}</Text>
          ) : null}
        </Text>
        <Text className="font-sans mt-1 text-meta text-ink-suave">
          {[f.formaFarmaceutica, f.laboratorio].filter(Boolean).join(' · ') || 'Sin datos de presentación'}
        </Text>
        <View className="mt-2.5 flex-row flex-wrap gap-1.5">
          {f.principiosActivos.map((p) => (
            <Chip key={p.id} texto={p.nombre} />
          ))}
        </View>
      </View>

      <Restricciones f={f} />

      <Eyebrow>Composición</Eyebrow>
      <Superficie elevacion="plana" className="mb-4">
        {f.principiosActivos.map((p, i) => (
          <View
            key={p.id}
            className={`px-3.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}
          >
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

      <Eyebrow>Embarazo y lactancia</Eyebrow>
      <Superficie elevacion="plana" className="mb-4 px-3.5 py-3">
        <Text className="font-sans text-meta leading-4 text-ink-suave">
          La severidad se calcula contra un paciente concreto y su semana de gestación. Sin
          paciente no se puede instanciar, así que acá no se muestra ninguna.
        </Text>
      </Superficie>

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

/**
 * Los cuatro puntos de restricción.
 *
 * Encendido significa "hay algo que mirar", apagado "no hay dato" — nunca
 * "es seguro" (regla 5). Embarazo y lactancia están siempre apagados porque el
 * catálogo todavía no trae esas restricciones a nivel de producto; se dejan a
 * la vista para que se note que faltan, en vez de desaparecer y hacer creer
 * que el fármaco no tiene ninguna.
 */
function Restricciones({ f }: { f: Ficha }) {
  const col = useColores();

  const items: Array<[string, boolean]> = [
    ['Renal', f.tieneAjusteRenal],
    ['Hepático', f.tieneAjusteHepatico],
    ['Embarazo', false],
    ['Lactancia', false],
  ];

  return (
    <Superficie elevacion="plana" className="mb-4 flex-row px-2 py-3">
      {items.map(([nombre, tiene]) => (
        <View key={nombre} className="flex-1 items-center">
          <View
            className="mb-1.5 rounded-full"
            style={{
              width: 8,
              height: 8,
              backgroundColor: tiene ? COLOR_SEVERIDAD.media : col.line,
            }}
          />
          <Text
            className={tiene ? 'font-medio text-eyebrow text-ink' : 'font-sans text-eyebrow text-tenue'}
          >
            {nombre}
          </Text>
        </View>
      ))}
    </Superficie>
  );
}

// --- pestaña 2 --------------------------------------------------------------

function Ajuste({ f }: { f: Ficha }) {
  return (
    <>
      <Eyebrow>Función renal</Eyebrow>
      {f.tablasRenales.length === 0 ? (
        <SinTabla detalle="Este producto no tiene tabla de ajuste renal en el catálogo." />
      ) : (
        f.tablasRenales.map((t, i) => (
          <Superficie key={i} elevacion="plana" className="mb-3">
            <View className="border-b border-line px-3.5 py-3">
              <Text className="text-body font-medio text-ink">
                {t.principioActivo}
                <Text className="font-sans text-ink-suave"> · vía {t.via.toLowerCase()}</Text>
              </Text>
              <Text className="font-sans mt-0.5 text-meta text-ink-suave">
                Función normal: {t.dosisFrNormal}
              </Text>
            </View>

            {t.rangos.map((r, j) => (
              <View
                key={j}
                className={`flex-row px-3.5 py-2 ${j > 0 ? 'border-t border-line' : ''}`}
              >
                {/* Monoespaciada y de ancho fijo: los rangos se leen como una
                    columna de números, no como texto corrido. */}
                <Text
                  className="font-mono-fuerte text-meta text-ink"
                  style={{ width: 88, fontVariant: ['tabular-nums'] }}
                >
                  {r.rangoTexto}
                </Text>
                <Text className="font-sans flex-1 text-meta leading-4 text-ink-suave">
                  {r.textoRecomendacion ?? '—'}
                </Text>
              </View>
            ))}

            {t.suplementoHd ? (
              <View className="border-t border-line px-3.5 py-2.5">
                <Text className="font-sans text-meta text-ink-suave">
                  Hemodiálisis: {t.suplementoHd}
                </Text>
              </View>
            ) : null}

            {t.requiereRevision ? (
              <View className="border-t border-line px-3.5 py-2">
                <Text
                  className="font-sans text-eyebrow uppercase tracking-wider"
                  style={{ color: COLOR_SEVERIDAD.media }}
                >
                  Entrada marcada para revisión en la fuente
                </Text>
              </View>
            ) : null}
          </Superficie>
        ))
      )}

      <View className="mt-2" />
      <Eyebrow>Función hepática</Eyebrow>
      {/* Dicho y no escondido: el ajuste hepático no está cargado para ningún
          producto todavía. Ocultar la sección haría parecer que el fármaco no
          lo necesita, que es exactamente lo que no sabemos (regla 5). */}
      <SinTabla detalle="El ajuste hepático todavía no está cargado en el catálogo. No significa que no haga falta: significa que no lo sabemos." />
    </>
  );
}

function SinTabla({ detalle }: { detalle: string }) {
  return (
    <Superficie elevacion="plana" className="mb-3 px-3.5 py-3">
      <Text className="text-body font-medio text-tenue">Sin tabla en el catálogo</Text>
      <Text className="font-sans mt-1 text-meta leading-4 text-ink-suave">{detalle}</Text>
    </Superficie>
  );
}

// --- pestaña 3 --------------------------------------------------------------

/** El orden en que se muestran los grupos: lo peor primero, siempre. */
const ORDEN_RANGOS: RangoGravedad[] = [0, 1, 2, 3];

function Interacciones({ f }: { f: Ficha }) {
  const [filtro, setFiltro] = useState<RangoGravedad | null>(null);

  const conRango = f.interaccionesConocidas.map((i) => ({
    ...i,
    rango: RANGO_POR_SEVERIDAD_INTERACCION[i.severidad],
  }));

  const grupos = ORDEN_RANGOS.map((rango) => ({
    rango,
    filas: conRango.filter((i) => i.rango === rango),
  })).filter((g) => g.filas.length > 0);

  const visibles = filtro === null ? grupos : grupos.filter((g) => g.rango === filtro);

  if (conRango.length === 0) {
    return (
      <Estado
        titulo="Sin interacciones conocidas"
        detalle="Ninguna regla del catálogo involucra a este fármaco."
      />
    );
  }

  return (
    <>
      {/* El filtro sólo aparece si hay más de un grupo: con todo en una sola
          gravedad, filtrar no separa nada. */}
      {grupos.length > 1 ? (
        <View className="mb-3 flex-row flex-wrap gap-2">
          <Chip texto="Todas" activo={filtro === null} onPress={() => setFiltro(null)} />
          {grupos.map((g) => (
            <Chip
              key={g.rango}
              texto={`${RANGO_ETIQUETA[g.rango]} ${g.filas.length}`}
              activo={filtro === g.rango}
              onPress={() => setFiltro(g.rango)}
            />
          ))}
        </View>
      ) : null}

      {visibles.map((g) => (
        <View key={g.rango} className="mb-2">
          <View className="mb-1.5 flex-row items-center">
            <View
              className="mr-2 rounded-full"
              style={{ width: 8, height: 8, backgroundColor: colorEspina(g.rango) }}
            />
            <Eyebrow>
              {RANGO_ETIQUETA[g.rango]} · {g.filas.length}
            </Eyebrow>
          </View>

          {g.filas.map((i, k) => (
            <Superficie
              key={`${i.conNombre}-${k}`}
              elevacion="plana"
              className="mb-2 px-3.5 py-2.5"
              style={{ borderLeftWidth: 4, borderLeftColor: colorEspina(g.rango) }}
            >
              <Text className="text-body font-medio capitalize text-ink">{i.conNombre}</Text>
              {/* La severidad no se repite acá: ya la dice el encabezado del
                  grupo. Ese lugar lo ocupa el mecanismo, que es lo que se
                  necesita para decidir. */}
              {i.texto ? (
                <Text className="font-sans mt-0.5 text-meta leading-4 text-ink-suave">
                  {i.texto}
                </Text>
              ) : null}
            </Superficie>
          ))}
        </View>
      ))}

      <Superficie elevacion="plana" className="mb-4 px-3.5 py-3">
        <Text className="font-sans text-meta leading-4 text-ink-suave">
          Sin paciente no hay severidad instanciada: esto es la regla, no el riesgo de alguien
          concreto. Para eso, cargá el fármaco en un paciente.
        </Text>
      </Superficie>
    </>
  );
}
