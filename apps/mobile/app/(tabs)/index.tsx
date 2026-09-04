import { useQuery } from '@tanstack/react-query';
import { Link, Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePlan } from '@/api/plan';
import { buscar } from '@/dominio/busqueda';
import { detalleDeAcceso, esDePago, rutaNuevoPaciente, rutaPaywall } from '@/dominio/plan-gratis';
import type { FilaPaciente, Inicio as DatosInicio } from '@/api/tipos';
import * as API from '@/api/endpoints';
import { FilaAnimada } from '@/ui/animacion';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { HojaInferior, OpcionHoja } from '@/ui/hoja-inferior';
import { Icono } from '@/ui/iconos';
import { CampoTexto, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { ResultadoConsulta } from '@/ui/resultado-consulta';
import { Superficie } from '@/ui/superficie';
import {
  claveColorPorClcr,
  colorEspina,
  COLOR_SEVERIDAD,
  RANGO_ETIQUETA,
  type RangoGravedad,
} from '@gfh/shared-types';

/**
 * Pacientes (2.x). Lista PLANA, no agrupada.
 *
 * El orden lo decide el backend: peor gravedad primero, después cantidad de
 * hallazgos, recién ahí alfabético. Un paciente con una interacción
 * contraindicada tiene que estar arriba aunque su apellido empiece con Z.
 *
 * Los grupos no encabezan la lista: aparecen como dato de cada fila y tienen
 * su propia pantalla. Con 40 pacientes en 3 grupos, los encabezados obligaban
 * a scrollear entre secciones para encontrar a uno.
 */
export default function Pacientes() {
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [consulta, setConsulta] = useState('');

  // Una sola consulta, sin `q`: `/inicio` ya trae la lista entera con el motor
  // corrido —es de donde salen los hallazgos de cada fila— así que filtrar acá
  // no le esconde nada al médico y sale desde la primera letra.
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['inicio'],
    queryFn: API.inicio,
  });

  // Con el plan gratis lleno, "Nuevo paciente" lleva al paywall directo. El
  // formulario también se protege solo, pero mandar ahí para que rebote deja
  // ver medio segundo una pantalla que nunca se iba a poder usar.
  const { data: plan } = usePlan();
  const rutaNueva = rutaNuevoPaciente(plan);

  const texto = consulta.trim();
  const buscando = texto.length >= 1;

  // Por apellido y por nombre, en ese orden: es como se lee la fila.
  //
  // El documento NO se busca, aunque el campo lo prometía desde antes de este
  // cambio: no viaja en la lista, y meterlo ahí obligaría a agregarlo al
  // contexto que usa el motor clínico, que no tiene por qué conocer un
  // identificador administrativo.
  const pacientes = useMemo(
    () => buscar(data?.pacientes ?? [], texto, { nombre: (p) => `${p.apellido}, ${p.nombre}` }),
    [data?.pacientes, texto],
  );

  const conHallazgos = pacientes.filter((p) => p.peorRango !== null);
  const limpios = pacientes.filter((p) => p.peorRango === null);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp ocultarVolver />

      <Pantalla onRefrescar={() => void refetch()} refrescando={isRefetching}>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[32px] font-fuerte" style={{ color: '#005228' }}>
            Pacientes
          </Text>
          <Pressable
            onPress={() => setMenuAbierto(true)}
            accessibilityRole="button"
            accessibilityLabel="Crear"
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: '#005228' }}
          >
            <Icono nombre="mas" tamano={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <CampoTexto
          value={consulta}
          onChangeText={setConsulta}
          placeholder="Buscar por nombre o apellido"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar paciente"
        />

        <ResultadoConsulta
          cargando={isLoading}
          error={error}
          onReintentar={() => void refetch()}
          filasSkeleton={3}
        >
          {pacientes.length === 0 && buscando ? (
            <Estado
              titulo="Sin coincidencias"
              detalle={`Ningún paciente coincide con «${texto}».`}
            />
          ) : null}

          {pacientes.length === 0 && !buscando ? (
            <Estado
              titulo="Todavía no cargaste pacientes"
              detalle="Creá uno para ver interacciones, ajuste renal y alertas."
              accion="Crear paciente"
              onAccion={() => router.push(rutaNueva as never)}
            />
          ) : null}

          {conHallazgos.length > 0 ? (
            <>
              <Eyebrow>Requieren atención · {conHallazgos.length}</Eyebrow>
              {conHallazgos.map((p, i) => (
                <FilaAnimada key={p.id} indice={i}>
                  <Fila paciente={p} />
                </FilaAnimada>
              ))}
            </>
          ) : null}

          {limpios.length > 0 ? (
            <View className={conHallazgos.length > 0 ? 'mt-4' : ''}>
              <Eyebrow>Sin hallazgos · {limpios.length}</Eyebrow>
              {limpios.map((p, i) => (
                <FilaAnimada key={p.id} indice={i}>
                  <Fila paciente={p} />
                </FilaAnimada>
              ))}
            </View>
          ) : null}
        </ResultadoConsulta>
      </Pantalla>

      <HojaInferior visible={menuAbierto} onCerrar={() => setMenuAbierto(false)}>
        {[
          {
            titulo: 'Crear paciente',
            ruta: rutaNueva,
            icono: 'pacientes' as const,
            // Se dice antes de tocar, no después: el médico elige si quiere
            // entrar al paywall en vez de que se le aparezca encima.
            detalle: detalleDeAcceso(plan),
          },
          {
            titulo: 'Crear grupo',
            ruta: esDePago(plan) ? rutaPaywall('grupo') : '/crear-grupo',
            icono: 'grupos' as const,
            detalle: detalleDeAcceso(plan),
          },
        ].map((o) => (
          <OpcionHoja
            key={o.titulo}
            titulo={o.titulo}
            icono={o.icono}
            detalle={o.detalle}
            onPress={() => {
              setMenuAbierto(false);
              router.push(o.ruta as never);
            }}
          />
        ))}
      </HojaInferior>
    </>
  );
}

function Fila({ paciente }: { paciente: FilaPaciente }) {
  // La banda es la del hallazgo más grave, no la del Clcr: es lo que define si
  // el paciente necesita atención. Sin hallazgos cae al color del Clcr, que
  // sigue siendo un dato — y "sin dato" es neutro, nunca verde.
  const color =
    paciente.peorRango !== null
      ? colorEspina(paciente.peorRango as RangoGravedad)
      : COLOR_SEVERIDAD[claveColorPorClcr(paciente.clcrMlMin)];

  const colorClcr = COLOR_SEVERIDAD[claveColorPorClcr(paciente.clcrMlMin)];

  return (
    <Link href={`/paciente/${paciente.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${paciente.nombre} ${paciente.apellido}, ${paciente.edadAnios} años, ${paciente.conteoHallazgos} hallazgos`}
      >
        <Superficie
          elevacion={paciente.peorRango !== null ? 'media' : 'plana'}
          className="mb-2.5 flex-row items-stretch"
        >
          <View style={{ width: 4, backgroundColor: color }} />
          <View className="flex-1 flex-row items-center px-3.5 py-3.5">
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-fila font-medio text-ink">
                  {paciente.apellido}, {paciente.nombre}
                </Text>
                {paciente.peorRango !== null ? (
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: color }}
                  >
                    <Text className="font-fuerte text-[10px] uppercase tracking-wider text-white">
                      {RANGO_ETIQUETA[paciente.peorRango as RangoGravedad]}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="font-sans mt-1 text-meta text-ink-suave">
                {paciente.edadAnios} años
                {paciente.grupoNombre ? ` · ${paciente.grupoNombre}` : ''}
              </Text>
            </View>

            {/* El Clcr en su propio bloque a la derecha: en una lista es la
                columna que se recorre de arriba abajo. */}
            <View className="items-end pl-2">
              <Text
                className="font-mono-fuerte text-fila"
                style={{ color: colorClcr, fontVariant: ['tabular-nums'] }}
              >
                {paciente.clcrMlMin ?? '—'}
              </Text>
              <Text className="font-sans text-eyebrow text-ink-suave">
                {paciente.clcrMlMin !== null ? 'mL/min' : 'sin dato'}
              </Text>
            </View>
          </View>
        </Superficie>
      </Pressable>
    </Link>
  );
}
