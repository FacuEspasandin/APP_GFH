import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { BuscadorPrincipioActivo, type PaSugerido } from '@/ui/buscador-pa';
import { BotonAvatar, EncabezadoApp } from '@/ui/encabezado-app';
import { AvisoDescartable, ConsultaPlegada, FilaResultado, Veredicto } from '@/ui/herramienta';
import { Icono } from '@/ui/iconos';
import { CampoTexto, Chip, Estado } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import {
  NOMBRE_ASCITIS,
  NOMBRE_ENCEFALOPATIA,
  RANGOS,
  type Ascitis,
  type Encefalopatia,
  type RangoGravedad,
} from '@gfh/shared-types';

/**
 * N fármacos contra una clase de Child-Pugh. Espeja a `renal.tsx`, incluido
 * que CRUZA el catálogo y por eso consume suscripción — la calculadora de la
 * clase sola sigue libre y sin red en `hepatico.tsx`, igual que `clcr.tsx`
 * respecto de esta.
 */
interface Resultado {
  clase: 'A' | 'B' | 'C' | null;
  puntos: number;
  glosa: string | null;
  resultados: Array<{
    nombre: string | null;
    sinDatos: boolean;
    dosisFuncionNormal?: string;
    recomendacion: string | null;
    tipo: string | null;
    requiereRevision?: boolean;
    rangoGravedad: 0 | 1 | 2 | 3 | null;
  }>;
}

const CLASES = ['A', 'B', 'C'] as const;
const OPCIONES_ASCITIS: Ascitis[] = ['AUSENTE', 'LEVE', 'MODERADA_SEVERA'];
const OPCIONES_ENCEFALOPATIA: Encefalopatia[] = ['AUSENTE', 'GRADO_1_2', 'GRADO_3_4'];

export default function HerramientaAjusteHepatico() {
  const router = useRouter();
  const col = useColores();
  const [seleccion, setSeleccion] = useState<PaSugerido[]>([]);
  const [modo, setModo] = useState<'directo' | 'calcular'>('directo');
  const [clase, setClase] = useState<'A' | 'B' | 'C' | null>(null);
  const [d, setD] = useState({ bilirrubinaMgDl: '', albuminaGDl: '', inr: '' });
  const [ascitis, setAscitis] = useState<Ascitis | null>(null);
  const [encefalopatia, setEncefalopatia] = useState<Encefalopatia | null>(null);
  const [editando, setEditando] = useState(true);

  const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(',', '.')));

  const calcular = useMutation({
    mutationFn: () =>
      API.herramientaAjusteHepatico<Resultado>({
        principioActivoIds: seleccion.map((s) => s.id),
        ...(modo === 'directo'
          ? { clase }
          : {
              bilirrubinaMgDl: num(d.bilirrubinaMgDl),
              albuminaGDl: num(d.albuminaGDl),
              inr: num(d.inr),
              ascitis: ascitis ?? undefined,
              encefalopatia: encefalopatia ?? undefined,
            }),
      }),
    onSuccess: () => setEditando(false),
  });

  const listo =
    seleccion.length > 0 &&
    (modo === 'directo'
      ? clase !== null
      : num(d.bilirrubinaMgDl) !== undefined &&
        num(d.albuminaGDl) !== undefined &&
        num(d.inr) !== undefined &&
        ascitis !== null &&
        encefalopatia !== null);

  if (editando || !calcular.data) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoApp derecha={<BotonAvatar onPress={() => router.push('/(tabs)/perfil')} />} />
        <ScrollView contentContainerClassName="px-4 pb-6 pt-4" keyboardShouldPersistTaps="handled">
          <View className="mb-1 flex-row items-center gap-2">
            <Icono nombre="higado" tamano={20} color="#B45309" />
            <Text className="text-fila font-fuerte text-ink">Ajuste Hepático</Text>
          </View>
          <Text className="mb-4 font-sans text-meta leading-5 text-ink-suave">
            Evaluá el ajuste de dosis de varios fármacos según la clase de Child-Pugh del paciente.
          </Text>

          <Superficie elevacion="media" className="mb-4 p-5">
            <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
              Fármacos
            </Text>
            <BuscadorPrincipioActivo
              seleccionados={seleccion}
              onAgregar={(pa) => setSeleccion((s) => (s.some((x) => x.id === pa.id) ? s : [...s, pa]))}
              onQuitar={(id) => setSeleccion((s) => s.filter((x) => x.id !== id))}
            />
          </Superficie>

          <Superficie elevacion="media" className="mb-4 p-5">
            <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
              Función hepática
            </Text>
            <View className="mb-3.5 flex-row gap-2">
              <Chip texto="Tengo la clase" activo={modo === 'directo'} onPress={() => setModo('directo')} />
              <Chip texto="Calcularla" activo={modo === 'calcular'} onPress={() => setModo('calcular')} />
            </View>

            {modo === 'directo' ? (
              <View className="flex-row gap-2">
                {CLASES.map((c) => (
                  <Chip key={c} texto={`Clase ${c}`} activo={clase === c} onPress={() => setClase(c)} />
                ))}
              </View>
            ) : (
              <>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <CampoTexto
                      etiqueta="Bilirrubina"
                      value={d.bilirrubinaMgDl}
                      onChangeText={(v) => setD((p) => ({ ...p, bilirrubinaMgDl: v }))}
                      keyboardType="numeric"
                      placeholder="mg/dL"
                      rango={RANGOS.bilirrubinaMgDl}
                      valor={num(d.bilirrubinaMgDl)}
                    />
                  </View>
                  <View className="flex-1">
                    <CampoTexto
                      etiqueta="Albúmina"
                      value={d.albuminaGDl}
                      onChangeText={(v) => setD((p) => ({ ...p, albuminaGDl: v }))}
                      keyboardType="numeric"
                      placeholder="g/dL"
                      rango={RANGOS.albuminaGDl}
                      valor={num(d.albuminaGDl)}
                    />
                  </View>
                  <View className="flex-1">
                    <CampoTexto
                      etiqueta="INR"
                      value={d.inr}
                      onChangeText={(v) => setD((p) => ({ ...p, inr: v }))}
                      keyboardType="numeric"
                      rango={RANGOS.inr}
                      valor={num(d.inr)}
                    />
                  </View>
                </View>

                <Text className="mb-1.5 mt-3 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
                  Ascitis
                </Text>
                <View className="mb-1 flex-row gap-2">
                  {OPCIONES_ASCITIS.map((o) => (
                    <Chip key={o} texto={NOMBRE_ASCITIS[o]} activo={ascitis === o} onPress={() => setAscitis(o)} />
                  ))}
                </View>

                <Text className="mb-1.5 mt-3 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
                  Encefalopatía
                </Text>
                <View className="flex-row gap-2">
                  {OPCIONES_ENCEFALOPATIA.map((o) => (
                    <Chip
                      key={o}
                      texto={NOMBRE_ENCEFALOPATIA[o]}
                      activo={encefalopatia === o}
                      onPress={() => setEncefalopatia(o)}
                    />
                  ))}
                </View>
              </>
            )}
          </Superficie>

          {calcular.isError ? (
            <View className="mb-4">
              <Estado titulo="No se pudo calcular" detalle={String((calcular.error as Error)?.message ?? '')} />
            </View>
          ) : null}

          <View className="mt-2 items-center border-t pt-6" style={{ borderColor: col.line }}>
            <Pressable
              onPress={() => calcular.mutate()}
              disabled={!listo || calcular.isPending}
              accessibilityRole="button"
              className="h-[60px] w-full flex-row items-center justify-center gap-3 rounded-full"
              style={{ backgroundColor: '#005228', opacity: !listo || calcular.isPending ? 0.5 : 1 }}
            >
              {calcular.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icono nombre="higado" tamano={18} color="#FFFFFF" />
                  <Text className="text-fila font-fuerte text-white">
                    {seleccion.length === 0
                      ? 'Agregá al menos un fármaco'
                      : `Calcular ajuste de ${seleccion.length}`}
                  </Text>
                </>
              )}
            </Pressable>
            <Text className="mt-2 text-center text-meta leading-5 text-ink-suave">
              Esta herramienta no guarda nada: al salir se pierde.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <ResultadoHepatico
      datos={calcular.data}
      onCambiar={() => setEditando(true)}
      consulta={{
        farmacos: seleccion.map((s) => s.nombre),
        detalle:
          modo === 'directo'
            ? `Clase Child-Pugh ${clase}`
            : `Bilirrubina ${d.bilirrubinaMgDl} · Albúmina ${d.albuminaGDl} · INR ${d.inr}`,
      }}
    />
  );
}

function ResultadoHepatico({
  datos,
  onCambiar,
  consulta,
}: {
  datos: Resultado;
  onCambiar: () => void;
  consulta: { farmacos: string[]; detalle: string };
}) {
  const filas = [...datos.resultados].sort((a, b) => orden(a.rangoGravedad) - orden(b.rangoGravedad));

  const conAjuste = filas.filter((r) => r.rangoGravedad !== null && r.rangoGravedad <= 2).length;
  const sinTabla = filas.filter((r) => r.sinDatos).length;

  return (
    <View className="flex-1 bg-paper">
      <ConsultaPlegada titulo={consulta.farmacos.join(' · ')} detalle={consulta.detalle} onCambiar={onCambiar} />

      <ScrollView contentContainerClassName="px-4 pb-4 pt-3">
        <Veredicto
          rango={rangoDeClase(datos.clase)}
          cifra={datos.clase ?? '—'}
          titulo="Clase Child-Pugh"
          detalle={[
            datos.glosa,
            conAjuste > 0
              ? `${conAjuste} de ${filas.length} ${conAjuste === 1 ? 'necesita' : 'necesitan'} ajuste`
              : 'Ninguno necesita ajuste con esta clase',
          ]
            .filter(Boolean)
            .join(' · ')}
        />

        {filas.map((r, i) => (
          <FilaResultado
            key={i}
            rango={r.rangoGravedad}
            titulo={r.nombre ?? 'Fármaco'}
            detalle={
              r.sinDatos
                ? 'Sin tabla de ajuste hepático. No hay recomendación que dar — eso no significa que no haga falta ajustar.'
                : (r.recomendacion ?? 'Sin texto de recomendación en la fuente.')
            }
          >
            {!r.sinDatos ? (
              <>
                {r.dosisFuncionNormal ? (
                  <Text className="font-sans mt-1 text-meta text-ink-suave">
                    Función normal: {r.dosisFuncionNormal}
                  </Text>
                ) : null}
                {r.requiereRevision ? (
                  <Text
                    className="font-sans mt-1 text-eyebrow uppercase tracking-wider"
                    style={{ color: '#B45309' }}
                  >
                    Entrada marcada para revisión en la fuente
                  </Text>
                ) : null}
              </>
            ) : null}
          </FilaResultado>
        ))}

        <AvisoDescartable
          extra={
            sinTabla > 0
              ? `${sinTabla} ${sinTabla === 1 ? 'fármaco no tiene' : 'fármacos no tienen'} tabla en el catálogo.`
              : undefined
          }
        />
      </ScrollView>
    </View>
  );
}

/** Sin gravedad va al final, no al principio. */
function orden(rango: RangoGravedad | null): number {
  return rango === null ? 99 : rango;
}

/**
 * La gravedad de la clase en sí, para teñir el veredicto — igual criterio que
 * `rangoDelClcr` en la herramienta renal: la clase es grave aunque ningún
 * fármaco cargado tenga tabla.
 */
function rangoDeClase(clase: 'A' | 'B' | 'C' | null): RangoGravedad {
  if (clase === 'C') return 1;
  if (clase === 'B') return 2;
  return 3;
}
