import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { usePlan } from '@/api/plan';
import { useRecientes } from '@/api/recientes';
import {
  agrupar,
  buscar,
  categoriasConContenido,
  filtrarPorCategoria,
  HERRAMIENTAS,
  NOMBRE_CATEGORIA,
  partir,
  type CategoriaHerramienta,
  type Herramienta,
} from '@/dominio/herramientas';
import { esDePago, rutaHerramienta } from '@/dominio/plan-gratis';
import { mostrarRecientes, recientesVigentes } from '@/dominio/recientes';
import { Icono } from '@/ui/iconos';
import { CampoTexto, Eyebrow, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Herramientas sin paciente (funcional §6.3).
 *
 * Dejó de ser una lista de cinco filas: van a ser veinte, y con veinte no hay
 * forma de encontrar nada recorriéndolas. Arriba van el buscador y los filtros
 * por aparato; abajo, la lista partida en **calcula** contra **cruza el
 * catálogo**, que es lo que decide el precio.
 *
 * Las que cruzan se muestran igual sin suscripción, con candado: esconderlas
 * escondería el producto, y nadie puede querer lo que no sabe que existe.
 */
export default function Herramientas() {
  const router = useRouter();
  const { data: plan } = usePlan();
  const { recientes, usar } = useRecientes();

  const [consulta, setConsulta] = useState('');
  const [categoria, setCategoria] = useState<CategoriaHerramienta | null>(null);

  // Sin pausa de tipeo: el filtro corre acá, no hay petición que ahorrar y
  // esperar 250 ms entre la letra y el resultado sería retardo puro.
  const buscada = consulta.trim();
  const buscando = buscada !== '';

  const conCandado = esDePago(plan);
  const categorias = useMemo(() => categoriasConContenido(), []);

  // Buscar gana sobre filtrar: quien escribió un nombre quiere ese nombre,
  // aunque el chip que quedó puesto lo deje afuera.
  const visibles = useMemo(
    () => (buscando ? buscar(HERRAMIENTAS, buscada) : filtrarPorCategoria(HERRAMIENTAS, categoria)),
    [buscando, buscada, categoria],
  );

  const grupos = useMemo(() => agrupar(visibles), [visibles]);

  const recientesAMostrar = recientesVigentes(recientes, HERRAMIENTAS);
  const hayRecientes =
    !buscando && categoria === null && mostrarRecientes(recientesAMostrar.length, HERRAMIENTAS.length);

  const abrir = (h: Herramienta) => {
    const destino = rutaHerramienta(h, plan);
    // Sólo cuenta como usada si abre la herramienta. Marcarla cuando el toque
    // termina en el paywall llenaría «usadas hace poco» de cosas que el médico
    // nunca llegó a ver.
    if (destino === h.ruta) usar(h.clave);
    router.push(destino as never);
  };

  return (
    <Pantalla>
      <CampoTexto
        value={consulta}
        onChangeText={setConsulta}
        placeholder="Buscar herramienta"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Buscar herramienta"
      />

      {/* Los chips desaparecen mientras se busca: el resultado ya está
          acotado, y dejar un filtro puesto encima haría dudar de por qué
          faltan filas. */}
      {!buscando ? (
        <FilaChips
          categorias={categorias}
          activa={categoria}
          onElegir={(c) => setCategoria(c === categoria ? null : c)}
        />
      ) : null}

      {hayRecientes ? (
        <>
          <Eyebrow>Usadas hace poco</Eyebrow>
          <Grupo
            herramientas={recientesAMostrar}
            consulta=""
            conCandado={conCandado}
            onAbrir={abrir}
          />
          <View className="h-3" />
        </>
      ) : null}

      {buscando && visibles.length === 0 ? <SinCoincidencias consulta={buscada} /> : null}

      {buscando && visibles.length > 0 ? (
        <>
          {/* Buscando no se separa en calculadoras y catálogo: dos títulos
              encima de tres filas es más estructura que contenido. */}
          <Eyebrow>
            {visibles.length} {visibles.length === 1 ? 'coincidencia' : 'coincidencias'}
          </Eyebrow>
          <Grupo
            herramientas={visibles}
            consulta={buscada}
            conCandado={conCandado}
            onAbrir={abrir}
          />
        </>
      ) : null}

      {!buscando
        ? grupos.map((g, i) => (
            <View key={g.titulo} className={i > 0 ? 'mt-4' : ''}>
              <Eyebrow>
                {g.titulo} · {g.herramientas.length}
              </Eyebrow>
              <Grupo
                herramientas={g.herramientas}
                consulta=""
                conCandado={conCandado}
                onAbrir={abrir}
              />
            </View>
          ))
        : null}

      {!buscando ? (
        <Text className="font-sans mt-4 px-1 text-eyebrow leading-4 text-ink-suave">
          {conCandado
            ? 'Las calculadoras son de uso libre. Cruzar fármacos contra el catálogo entra en la suscripción.'
            : 'No se guarda nada. Al salir de una herramienta, los valores se pierden.'}
        </Text>
      ) : null}
    </Pantalla>
  );
}

/**
 * Los filtros por aparato, en una fila que se desborda.
 *
 * Y no en una grilla fija: con cuatro categorías una grilla deja media pantalla
 * en blanco, y con ocho hay que rediseñarla. La fila crece sin cambiar de forma.
 */
function FilaChips({
  categorias,
  activa,
  onElegir,
}: {
  categorias: readonly CategoriaHerramienta[];
  activa: CategoriaHerramienta | null;
  onElegir: (c: CategoriaHerramienta | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-4 mb-3.5 grow-0"
      contentContainerClassName="gap-1.5 px-4"
    >
      <ChipFiltro texto="Todas" activo={activa === null} onPress={() => onElegir(null)} />
      {categorias.map((c) => (
        <ChipFiltro
          key={c}
          texto={NOMBRE_CATEGORIA[c]}
          activo={activa === c}
          onPress={() => onElegir(c)}
        />
      ))}
    </ScrollView>
  );
}

function ChipFiltro({
  texto,
  activo,
  onPress,
}: {
  texto: string;
  activo: boolean;
  onPress: () => void;
}) {
  const col = useColores();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      className="rounded-chip px-3 py-1.5"
      style={{
        backgroundColor: activo ? col.primary : col.surface,
        borderWidth: 1,
        borderColor: activo ? col.primary : col.line,
      }}
    >
      <Text
        className="text-meta"
        style={{ color: activo ? '#FFFFFF' : col.inkSuave, fontWeight: activo ? '600' : '400' }}
      >
        {texto}
      </Text>
    </Pressable>
  );
}

function Grupo({
  herramientas,
  consulta,
  conCandado,
  onAbrir,
}: {
  herramientas: readonly Herramienta[];
  consulta: string;
  conCandado: boolean;
  onAbrir: (h: Herramienta) => void;
}) {
  return (
    <Superficie elevacion="plana">
      {herramientas.map((h, i) => (
        <Fila
          key={h.clave}
          h={h}
          consulta={consulta}
          primera={i === 0}
          conCandado={conCandado && h.cruza}
          onPress={() => onAbrir(h)}
        />
      ))}
    </Superficie>
  );
}

function Fila({
  h,
  consulta,
  primera,
  conCandado,
  onPress,
}: {
  h: Herramienta;
  consulta: string;
  primera: boolean;
  conCandado: boolean;
  onPress: () => void;
}) {
  const col = useColores();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={conCandado ? `${h.titulo}. Incluido en la suscripción` : h.titulo}
      className={`flex-row items-center px-3 py-2.5 ${primera ? '' : 'border-t border-line'}`}
    >
      {/* El azulejo es siempre el mismo celeste. En GFH el color significa
          gravedad, y una lista de herramientas no es una salida clínica:
          teñir las calculadoras de verde y las dosis de naranja le pondría una
          escala clínica a algo que no la tiene. Distingue el dibujo. */}
      <View
        className="mr-3 h-9 w-9 items-center justify-center rounded"
        style={{ backgroundColor: '#E0F2FE' }}
      >
        <Icono nombre={h.icono} tamano={18} color="#075985" />
      </View>

      <View className="flex-1">
        <Resaltado texto={h.titulo} consulta={consulta} className="text-fila font-medio text-ink" />
        <Resaltado
          texto={h.detalle}
          consulta={consulta}
          className="font-sans mt-0.5 text-meta text-ink-suave"
        />
      </View>

      {conCandado ? (
        <View
          className="ml-2 h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: col.primaryLight }}
        >
          <Icono nombre="candado" tamano={14} color={col.primary} />
        </View>
      ) : (
        <Icono nombre="chevron" tamano={15} color={col.tenue} />
      )}
    </Pressable>
  );
}

/** El pedazo que coincide, sobre fondo ámbar. Sin `consulta` es un `Text` común. */
function Resaltado({
  texto,
  consulta,
  className,
}: {
  texto: string;
  consulta: string;
  className: string;
}) {
  if (consulta === '') return <Text className={className}>{texto}</Text>;

  return (
    <Text className={className}>
      {partir(texto, consulta).map((t, i) =>
        t.coincide ? (
          <Text key={i} style={{ backgroundColor: '#FEF3C7' }}>
            {t.texto}
          </Text>
        ) : (
          t.texto
        ),
      )}
    </Text>
  );
}

/**
 * El vacío manda al Buscador.
 *
 * Escribir un nombre de fármaco acá va a pasar seguido, y decir sólo «sin
 * resultados» desperdicia el momento en que ya sabemos qué quería.
 */
function SinCoincidencias({ consulta }: { consulta: string }) {
  const router = useRouter();

  return (
    <Superficie elevacion="plana" className="items-center px-4 py-6">
      <Text className="text-center text-fila font-medio text-ink">
        Ninguna herramienta se llama «{consulta}»
      </Text>
      <Text className="font-sans mt-1.5 text-center text-meta leading-5 text-ink-suave">
        Los fármacos se buscan en el Buscador, que es donde está la ficha con sus restricciones e
        interacciones.
      </Text>
      <Pressable
        onPress={() => router.push(`/buscador?q=${encodeURIComponent(consulta)}` as never)}
        accessibilityRole="button"
        className="mt-3 py-1"
      >
        <Text className="font-medio text-meta text-accent">Buscar «{consulta}» en fármacos</Text>
      </Pressable>
    </Superficie>
  );
}
