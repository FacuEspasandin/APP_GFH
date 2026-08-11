import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { BuscadorPrincipioActivo, type PaSugerido } from '@/ui/buscador-pa';
import { useValorDemorado } from '@/ui/demora';
import {
  AvisoDescartable,
  Consulta,
  ConsultaPlegada,
  FilaResultado,
  Veredicto,
} from '@/ui/herramienta';
import { CampoTexto, Chip, Estado } from '@/ui/kit';
import {
  peorRango,
  RANGO_POR_SEVERIDAD_ALERTA,
  type RangoGravedad,
  type SeveridadAlerta,
} from '@gfh/shared-types';

interface Opcion {
  id: string;
  nombre: string;
  codigo: string;
}

interface Resultado {
  farmaco: string;
  alertasCondicion: Array<{ condicion: string; severidad: SeveridadAlerta; texto: string }>;
  alergias: Array<{ tipo: string; rango: RangoGravedad; grupo: string | null; bloquea: boolean }>;
  semanaNoRegistrada: boolean;
}

/** Herramienta 2 (4.4 / 4.5): un candidato contra condiciones y alergias sueltas. */
export default function HerramientaCondicionAlergia() {
  const [farmaco, setFarmaco] = useState<PaSugerido[]>([]);
  const [condiciones, setCondiciones] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [severidad, setSeveridad] = useState<'LEVE' | 'MODERADA' | 'GRAVE'>('MODERADA');
  const [editando, setEditando] = useState(true);

  const { data: catCond } = useQuery({
    queryKey: ['cond'],
    queryFn: () => api.get<Opcion[]>('/catalogo/condiciones'),
  });
  const { data: catGrupos } = useQuery({
    queryKey: ['grupos'],
    queryFn: () => api.get<Opcion[]>('/catalogo/grupos-alergenicos'),
  });

  const calcular = useMutation({
    mutationFn: () =>
      api.post<Resultado>('/herramientas/condicion-alergia', {
        principioActivoId: farmaco[0]!.id,
        condicionIds: condiciones,
        grupoAlergenicoIds: grupos,
        severidadAlergia: severidad,
      }),
    onSuccess: () => setEditando(false),
  });

  const alternar = (lista: string[], set: (v: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  if (editando || !calcular.data) {
    return (
      <Consulta
        accion={farmaco.length === 0 ? 'Elegí un fármaco' : `Analizar ${farmaco[0]!.nombre}`}
        onAccion={() => calcular.mutate()}
        cargando={calcular.isPending}
        deshabilitado={farmaco.length === 0}
      >
        <BloqueFormulario titulo="Fármaco candidato" exigencia="Obligatorio">
          <BuscadorPrincipioActivo
            unico
            seleccionados={farmaco}
            onAgregar={(pa) => setFarmaco([pa])}
            onQuitar={() => setFarmaco([])}
          />
        </BloqueFormulario>

        <BloqueFormulario titulo="Condiciones del paciente" exigencia="Opcional">
          <SelectorFiltrable
            catalogo={catCond ?? []}
            elegidos={condiciones}
            onAlternar={(id) => alternar(condiciones, setCondiciones, id)}
            placeholder="Buscar condición"
            vacio="Sin condiciones seleccionadas."
          />
        </BloqueFormulario>

        <BloqueFormulario titulo="Alergias" exigencia="Opcional">
          <SelectorFiltrable
            catalogo={catGrupos ?? []}
            elegidos={grupos}
            onAlternar={(id) => alternar(grupos, setGrupos, id)}
            placeholder="Buscar familia alergénica"
            vacio="Sin alergias seleccionadas."
          />

          {grupos.length > 0 ? (
            <View className="mt-3.5">
              <Text className="mb-1.5 text-eyebrow font-medio uppercase tracking-wider text-ink-suave">
                Severidad de la alergia
              </Text>
              <View className="flex-row gap-2">
                {(['LEVE', 'MODERADA', 'GRAVE'] as const).map((s) => (
                  <Chip
                    key={s}
                    texto={s.charAt(0) + s.slice(1).toLowerCase()}
                    activo={severidad === s}
                    onPress={() => setSeveridad(s)}
                  />
                ))}
              </View>
              {/* Regla 4: sólo la coincidencia exacta con grave bloquea. Decirlo
                  acá evita que el médico crea que marcar "grave" prohíbe todo. */}
              <Text className="font-sans mt-2 text-meta leading-4 text-ink-suave">
                Sólo la coincidencia exacta con alergia grave impide prescribir. El cruce por
                familia nunca bloquea: pide confirmación.
              </Text>
            </View>
          ) : null}
        </BloqueFormulario>

        <AvisoDescartable />

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
    <ResultadoCondicionAlergia
      datos={calcular.data}
      onCambiar={() => setEditando(true)}
      detalle={detalleConsulta(condiciones.length, grupos.length)}
    />
  );
}

function detalleConsulta(condiciones: number, alergias: number): string {
  const partes = [
    condiciones > 0 ? `${condiciones} ${condiciones === 1 ? 'condición' : 'condiciones'}` : null,
    alergias > 0 ? `${alergias} ${alergias === 1 ? 'alergia' : 'alergias'}` : null,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(' · ') : 'Sin condiciones ni alergias cargadas';
}

/**
 * Chips con buscador y los elegidos arriba.
 *
 * Antes era la lista entera del catálogo como un muro de chips que crece con
 * cada condición nueva. Con 40 opciones, encontrar "insuficiencia cardíaca"
 * era leer las 40.
 */
function SelectorFiltrable({
  catalogo,
  elegidos,
  onAlternar,
  placeholder,
  vacio,
}: {
  catalogo: Opcion[];
  elegidos: string[];
  onAlternar: (id: string) => void;
  placeholder: string;
  vacio: string;
}) {
  const [texto, setTexto] = useState('');
  const filtro = useValorDemorado(texto.trim().toLowerCase());

  const seleccionados = catalogo.filter((o) => elegidos.includes(o.id));
  const resto = catalogo
    .filter((o) => !elegidos.includes(o.id))
    .filter((o) => (filtro.length >= 2 ? o.nombre.toLowerCase().includes(filtro) : true))
    // Sin búsqueda no se vuelca el catálogo entero: se muestran unos pocos y
    // el campo es el camino para el resto.
    .slice(0, filtro.length >= 2 ? 20 : 6);

  return (
    <>
      {seleccionados.length > 0 ? (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {seleccionados.map((o) => (
            <Chip key={o.id} texto={o.nombre} activo onPress={() => onAlternar(o.id)} />
          ))}
        </View>
      ) : (
        <Text className="font-sans mb-3 text-meta text-tenue">{vacio}</Text>
      )}

      <CampoTexto
        value={texto}
        onChangeText={setTexto}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View className="flex-row flex-wrap gap-2">
        {resto.map((o) => (
          <Chip key={o.id} texto={o.nombre} onPress={() => onAlternar(o.id)} />
        ))}
      </View>

      {filtro.length >= 2 && resto.length === 0 ? (
        <Text className="font-sans text-meta text-ink-suave">Sin coincidencias para «{texto}».</Text>
      ) : null}
    </>
  );
}

function ResultadoCondicionAlergia({
  datos,
  onCambiar,
  detalle,
}: {
  datos: Resultado;
  onCambiar: () => void;
  detalle: string;
}) {
  const alertas = datos.alertasCondicion.map((a) => ({
    ...a,
    rango: RANGO_POR_SEVERIDAD_ALERTA[a.severidad],
  }));

  const rangos = [...alertas.map((a) => a.rango), ...datos.alergias.map((a) => a.rango)];
  const peor = peorRango(rangos);
  const bloquea = datos.alergias.some((a) => a.bloquea);
  const total = alertas.length + datos.alergias.length;

  return (
    <View className="flex-1 bg-paper">
      <ConsultaPlegada titulo={datos.farmaco} detalle={detalle} onCambiar={onCambiar} />

      <ScrollView contentContainerClassName="px-4 pb-4 pt-3">
        <Veredicto
          rango={peor}
          titulo={
            bloquea
              ? 'No se puede prescribir'
              : total === 0
                ? 'Sin alertas para lo seleccionado'
                : `${total} ${total === 1 ? 'alerta' : 'alertas'}`
          }
          detalle={
            bloquea
              ? 'Coincidencia exacta con una alergia grave registrada.'
              : total === 0
                ? 'No es lo mismo que «es seguro»: el catálogo cubre lo que cubre.'
                : undefined
          }
        />

        {alertas
          .sort((a, b) => a.rango - b.rango)
          .map((a, i) => (
            <FilaResultado key={`c-${i}`} rango={a.rango} titulo={a.condicion} detalle={a.texto} />
          ))}

        {datos.alergias.map((al, i) => (
          <FilaResultado
            key={`a-${i}`}
            rango={al.rango}
            titulo={`${al.tipo === 'EXACTA' ? 'Alergia exacta' : 'Cruce de familia'}${
              al.grupo ? ` · ${al.grupo}` : ''
            }`}
            detalle={
              al.bloquea
                ? 'Impide prescribir: coincidencia exacta con alergia grave.'
                : 'No bloquea, pero exige confirmación explícita del médico.'
            }
          />
        ))}

        {datos.semanaNoRegistrada ? (
          <FilaResultado
            rango={null}
            titulo="Sin semanas de gestación"
            detalle="Se mantienen todas las alertas: ante falta de dato no se descarta ninguna."
          />
        ) : null}

        <AvisoDescartable />
      </ScrollView>
    </View>
  );
}
