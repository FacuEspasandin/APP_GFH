import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { BuscadorPrincipioActivo, type PaSugerido } from '@/ui/buscador-pa';
import { AvisoNeutro, Boton, Chip, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { colorEspina, RANGO_POR_SEVERIDAD_ALERTA, type RangoGravedad } from '@gfh/shared-types';

interface Opcion { id: string; nombre: string; codigo: string }
interface Resultado {
  farmaco: string;
  alertasCondicion: Array<{ condicion: string; severidad: 'INFO' | 'PRECAUCION' | 'EVITAR' | 'CONTRAINDICADO'; texto: string }>;
  alergias: Array<{ tipo: string; rango: RangoGravedad; grupo: string | null; bloquea: boolean }>;
  semanaNoRegistrada: boolean;
}

/** Herramienta 2 (4.4 / 4.5): un candidato contra condiciones y alergias sueltas. */
export default function HerramientaCondicionAlergia() {
  const [farmaco, setFarmaco] = useState<PaSugerido[]>([]);
  const [condiciones, setCondiciones] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [severidad, setSeveridad] = useState<'LEVE' | 'MODERADA' | 'GRAVE'>('MODERADA');

  const { data: catCond } = useQuery({ queryKey: ['cond'], queryFn: () => api.get<Opcion[]>('/catalogo/condiciones') });
  const { data: catGrupos } = useQuery({ queryKey: ['grupos'], queryFn: () => api.get<Opcion[]>('/catalogo/grupos-alergenicos') });

  const calcular = useMutation({
    mutationFn: () =>
      api.post<Resultado>('/herramientas/condicion-alergia', {
        principioActivoId: farmaco[0]!.id,
        condicionIds: condiciones,
        grupoAlergenicoIds: grupos,
        severidadAlergia: severidad,
      }),
  });

  const alternar = (lista: string[], set: (v: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  return (
    <Pantalla>
      <BuscadorPrincipioActivo
        unico
        seleccionados={farmaco}
        onAgregar={(pa) => setFarmaco([pa])}
        onQuitar={() => setFarmaco([])}
      />

      <Eyebrow>Condiciones del paciente</Eyebrow>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {catCond?.map((c) => (
          <Chip
            key={c.id}
            texto={c.nombre}
            activo={condiciones.includes(c.id)}
            onPress={() => alternar(condiciones, setCondiciones, c.id)}
          />
        ))}
      </View>

      <Eyebrow>Alergias</Eyebrow>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {catGrupos?.map((g) => (
          <Chip key={g.id} texto={g.nombre} activo={grupos.includes(g.id)} onPress={() => alternar(grupos, setGrupos, g.id)} />
        ))}
      </View>
      {grupos.length > 0 ? (
        <>
          <Eyebrow>Severidad de la alergia</Eyebrow>
          <View className="mb-4 flex-row gap-2">
            {(['LEVE', 'MODERADA', 'GRAVE'] as const).map((s) => (
              <Chip key={s} texto={s} activo={severidad === s} onPress={() => setSeveridad(s)} />
            ))}
          </View>
        </>
      ) : null}

      <Boton onPress={() => calcular.mutate()} cargando={calcular.isPending} deshabilitado={farmaco.length === 0}>
        Analizar
      </Boton>

      {calcular.data ? (
        <View className="mt-5">
          <Eyebrow>{calcular.data.farmaco}</Eyebrow>

          {calcular.data.alertasCondicion.length === 0 && calcular.data.alergias.length === 0 ? (
            <AvisoNeutro>
              Sin alertas para lo seleccionado. No es lo mismo que «es seguro».
            </AvisoNeutro>
          ) : null}

          {calcular.data.alertasCondicion.map((a, i) => {
            const rango = RANGO_POR_SEVERIDAD_ALERTA[a.severidad];
            return (
              <View key={i} className="mb-2 flex-row items-stretch overflow-hidden rounded-card border border-line bg-surface">
                <View style={{ width: 4, backgroundColor: colorEspina(rango) }} />
                <View className="flex-1 px-3.5 py-3">
                  <Text className="text-body font-medio text-ink">{a.condicion}</Text>
                  <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">{a.texto}</Text>
                </View>
              </View>
            );
          })}

          {calcular.data.alergias.map((al, i) => (
            <View key={`al-${i}`} className="mb-2 flex-row items-stretch overflow-hidden rounded-card border border-line bg-surface">
              <View style={{ width: 4, backgroundColor: colorEspina(al.rango) }} />
              <View className="flex-1 px-3.5 py-3">
                <Text className="text-body font-medio text-ink">
                  {al.tipo === 'EXACTA' ? 'Alergia exacta' : 'Cruce de familia'}
                  {al.grupo ? ` · ${al.grupo}` : ''}
                </Text>
                <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">
                  {al.bloquea
                    ? 'Impide prescribir: coincidencia exacta con alergia grave.'
                    : 'No bloquea, pero exige confirmación explícita del médico.'}
                </Text>
              </View>
            </View>
          ))}

          {calcular.data.semanaNoRegistrada ? (
            <AvisoNeutro>
              Faltan semanas de gestación: se mantienen todas las alertas.
            </AvisoNeutro>
          ) : null}
        </View>
      ) : null}

      {calcular.isError ? <Estado titulo="No se pudo calcular" detalle={String((calcular.error as Error)?.message ?? '')} /> : null}
    </Pantalla>
  );
}
