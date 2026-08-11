import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { paresDe, textoParesLimpios, titularInteracciones } from '@/dominio/interacciones';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { BuscadorPrincipioActivo, type PaSugerido } from '@/ui/buscador-pa';
import {
  AvisoDescartable,
  Consulta,
  ConsultaPlegada,
  FilaResultado,
  GrupoGravedad,
  Veredicto,
} from '@/ui/herramienta';
import { Estado } from '@/ui/kit';
import {
  peorRango,
  RANGO_POR_SEVERIDAD_INTERACCION,
  type RangoGravedad,
  type SeveridadInteraccion,
} from '@gfh/shared-types';

interface Resultado {
  farmacos: string[];
  totalPares: number;
  conInteraccion: number;
  pares: Array<{ a: string; b: string; severidad: SeveridadInteraccion; texto: string }>;
}

/** Herramienta 1 (4.2 / 4.3): N fármacos, todos los pares. */
export default function HerramientaInteracciones() {
  const [seleccion, setSeleccion] = useState<PaSugerido[]>([]);
  const [editando, setEditando] = useState(true);

  const calcular = useMutation({
    mutationFn: () =>
      api.post<Resultado>('/herramientas/interacciones', {
        principioActivoIds: seleccion.map((s) => s.id),
      }),
    onSuccess: () => setEditando(false),
  });

  const pares = paresDe(seleccion.length);

  if (editando || !calcular.data) {
    return (
      <Consulta
        accion={seleccion.length < 2 ? 'Agregá al menos 2 fármacos' : `Analizar ${pares} pares`}
        onAccion={() => calcular.mutate()}
        cargando={calcular.isPending}
        deshabilitado={seleccion.length < 2}
      >
        <BloqueFormulario titulo="Fármacos a cruzar" exigencia="Obligatorio">
          <BuscadorPrincipioActivo
            seleccionados={seleccion}
            onAgregar={(pa) => setSeleccion((s) => (s.some((x) => x.id === pa.id) ? s : [...s, pa]))}
            onQuitar={(id) => setSeleccion((s) => s.filter((x) => x.id !== id))}
          />
        </BloqueFormulario>

        <AvisoDescartable
          extra={
            seleccion.length >= 2
              ? `Se cruzan todos contra todos: con ${seleccion.length} fármacos son ${pares} pares.`
              : 'Se cruzan todos contra todos.'
          }
        />

        {calcular.isError ? (
          <Estado
            titulo="No se pudo calcular"
            detalle={String((calcular.error as Error)?.message ?? '')}
          />
        ) : null}
      </Consulta>
    );
  }

  return (
    <ResultadoInteracciones
      datos={calcular.data}
      onCambiar={() => setEditando(true)}
      cuantos={seleccion.length}
    />
  );
}

function ResultadoInteracciones({
  datos,
  onCambiar,
  cuantos,
}: {
  datos: Resultado;
  onCambiar: () => void;
  cuantos: number;
}) {
  const conRango = datos.pares.map((p) => ({
    ...p,
    rango: RANGO_POR_SEVERIDAD_INTERACCION[p.severidad],
  }));

  const peor = peorRango(conRango.map((p) => p.rango));

  // Los grupos salen del peor al más leve, no del orden en que vinieron.
  const grupos = ([0, 1, 2, 3] as RangoGravedad[])
    .map((rango) => ({ rango, filas: conRango.filter((p) => p.rango === rango) }))
    .filter((g) => g.filas.length > 0);

  const sinInteraccion = datos.totalPares - datos.conInteraccion;

  return (
    <View className="flex-1 bg-paper">
      <ConsultaPlegada
        titulo={datos.farmacos.join(' · ')}
        detalle={`${cuantos} fármacos · ${datos.totalPares} pares`}
        onCambiar={onCambiar}
      />

      <ScrollView contentContainerClassName="px-4 pb-4 pt-3">
        <Veredicto
          rango={peor}
          titulo={titularInteracciones(datos.pares)}
          detalle={
            datos.conInteraccion === 0
              ? `Ninguno de los ${datos.totalPares} pares tiene interacción conocida en el catálogo.`
              : `De ${datos.totalPares} pares, ${datos.conInteraccion} ${
                  datos.conInteraccion === 1 ? 'tiene' : 'tienen'
                } interacción conocida.`
          }
        />

        {grupos.map((g) => (
          <View key={g.rango}>
            <GrupoGravedad rango={g.rango} cuantos={g.filas.length} />
            {g.filas.map((p, i) => (
              <FilaResultado
                key={`${p.a}-${p.b}-${i}`}
                rango={g.rango}
                titulo={
                  <Text className="text-body font-medio text-ink">
                    {p.a}
                    <Text className="font-sans text-tenue"> + </Text>
                    {p.b}
                  </Text>
                }
                detalle={p.texto}
              />
            ))}
          </View>
        ))}

        {/* "Sin interacción conocida" no es "es seguro": el catálogo cubre lo
            que cubre, y decir lo contrario sería inferir seguridad (regla 5). */}
        {sinInteraccion > 0 ? (
          <AvisoDescartable
            extra={`${sinInteraccion} ${
              sinInteraccion === 1 ? 'par no tiene' : 'pares no tienen'
            } interacción conocida en el catálogo, que no es lo mismo que decir que sean seguros.`}
          />
        ) : (
          <AvisoDescartable />
        )}
      </ScrollView>
    </View>
  );
}

