import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { api, ErrorApi } from '@/api/cliente';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { ConsultaPlegada, Veredicto } from '@/ui/herramienta';
import { Icono } from '@/ui/iconos';
import { Boton, CampoTexto } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { COLOR_SEVERIDAD } from '@gfh/shared-types';

interface Linea {
  textoOriginal: string;
  productoComercialIdSugerido: string | null;
  nombreSugerido: string | null;
  dosis: string | null;
  frecuencia: string | null;
  requiereBusquedaManual: boolean;
}

/** Lo que el médico revisa y puede corregir antes de que se cree nada. */
interface LineaRevisada extends Linea {
  elegida: boolean;
  dosisEditada: string;
  frecuenciaEditada: string;
}

/**
 * Carga de tratamiento (3.3.x).
 *
 * Se llamaba "Cargar por lista" y abría con la foto — que es lo único que no
 * funciona, porque falta el proveedor de visión. La foto y el texto son dos
 * formas de lo mismo, así que el nombre no se casa con ninguna y el camino que
 * anda va primero.
 *
 * La revisión línea por línea es la regla no negociable 2: nada se crea sin
 * confirmación humana, y eso no depende de cómo se obtuvo el texto.
 */
export default function CargarTratamiento() {
  const col = useColores();

  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [crudo, setCrudo] = useState('');
  const [lineas, setLineas] = useState<LineaRevisada[] | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const textos = crudo
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  const matchear = useMutation({
    mutationFn: () => api.post<Linea[]>(`/pacientes/${pacienteId}/lineas/matchear`, { textos }),
    onSuccess: (r) =>
      setLineas(
        r.map((l) => ({
          ...l,
          // Nada viene elegido por default: el médico confirma cada línea.
          elegida: false,
          dosisEditada: l.dosis ?? '',
          frecuenciaEditada: l.frecuencia ?? '',
        })),
      ),
  });

  const probarFoto = useMutation({
    mutationFn: () => api.post(`/pacientes/${pacienteId}/foto`, { imagenBase64: '' }),
    onError: (e) => setErrorFoto(e instanceof ErrorApi ? e.message : 'No disponible.'),
  });

  const confirmar = useMutation({
    mutationFn: async () => {
      for (const l of (lineas ?? []).filter((x) => x.elegida)) {
        await api.post(`/pacientes/${pacienteId}/prescripciones`, {
          productoComercialId: l.productoComercialIdSugerido,
          // Lo que el médico dejó escrito, no un literal. Antes, sin dosis
          // detectada, se creaba la prescripción con el texto "a confirmar"
          // adentro del campo dosis y nadie volvía a mirarla.
          dosis: l.dosisEditada.trim(),
          frecuencia: l.frecuenciaEditada.trim(),
          via: 'ORAL',
        });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      router.back();
    },
  });

  const actualizar = (i: number, cambio: Partial<LineaRevisada>) =>
    setLineas((ls) => (ls ?? []).map((l, k) => (k === i ? { ...l, ...cambio } : l)));

  // --- paso 1: pegar -------------------------------------------------------
  if (!lineas) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-paper"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="px-4 pb-4 pt-3" keyboardShouldPersistTaps="handled">
          <BloqueFormulario titulo="Pegá o escribí el listado" etiqueta="Una por línea">
            <TextInput
              value={crudo}
              onChangeText={setCrudo}
              multiline
              placeholder={'Eliquis 5 mg cada 12 h\nIbupirac 600 mg cada 8 h'}
              placeholderTextColor={col.tenue}
              accessibilityLabel="Listado de medicación"
              className="min-h-[120px] rounded-chip border border-line bg-surface px-3.5 py-3 text-body text-ink"
              style={{ textAlignVertical: 'top' }}
            />
          </BloqueFormulario>

          {/* Apagado y con el motivo a la vista, no después de tocarlo. */}
          <BloqueFormulario titulo="Desde una foto" etiqueta="No disponible">
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              El reconocimiento de imágenes todavía no está conectado. Cuando lo esté, la foto se
              procesa y se descarta: no se guarda nunca.
            </Text>
            {errorFoto ? (
              <Text className="font-sans mt-2 text-meta leading-5 text-ink-suave">{errorFoto}</Text>
            ) : (
              <Pressable onPress={() => probarFoto.mutate()} accessibilityRole="button" className="mt-2">
                <Text className="font-medio text-meta text-accent">Probar igual</Text>
              </Pressable>
            )}
          </BloqueFormulario>
        </ScrollView>

        <View className="border-t border-line bg-surface px-4 py-3">
          <Boton
            onPress={() => matchear.mutate()}
            cargando={matchear.isPending}
            deshabilitado={textos.length === 0}
          >
            {textos.length === 0
              ? 'Escribí al menos una línea'
              : `Buscar ${textos.length} ${textos.length === 1 ? 'línea' : 'líneas'} en el catálogo`}
          </Boton>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // --- paso 2: revisar -----------------------------------------------------
  const elegidas = lineas.filter((l) => l.elegida);
  const reconocidas = lineas.filter((l) => !l.requiereBusquedaManual);
  const sinMatch = lineas.length - reconocidas.length;

  // Una línea sin pauta no se puede crear: es el dato que el catálogo no trae.
  const listas = elegidas.filter((l) => l.dosisEditada.trim() && l.frecuenciaEditada.trim());
  const faltaPauta = elegidas.length - listas.length;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ConsultaPlegada
        titulo={`${lineas.length} ${lineas.length === 1 ? 'línea pegada' : 'líneas pegadas'}`}
        detalle={
          sinMatch === 0
            ? 'Todas reconocidas'
            : `${reconocidas.length} reconocidas · ${sinMatch} sin coincidencia`
        }
        onCambiar={() => setLineas(null)}
      />

      <ScrollView contentContainerClassName="px-4 pb-4 pt-3" keyboardShouldPersistTaps="handled">
        <Veredicto
          rango={null}
          titulo="Nada se carga hasta que confirmes"
          detalle="Revisá cada línea y ajustá la pauta si hace falta."
        />

        <View className="mb-3 flex-row items-center justify-between">
          <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            {elegidas.length} de {reconocidas.length} elegidas
          </Text>
          <Pressable
            onPress={() =>
              setLineas((ls) =>
                (ls ?? []).map((l) => (l.requiereBusquedaManual ? l : { ...l, elegida: true })),
              )
            }
            accessibilityRole="button"
          >
            <Text className="font-medio text-meta text-accent">Elegir todas</Text>
          </Pressable>
        </View>

        {lineas.map((l, i) => (
          <FilaLinea
            key={i}
            linea={l}
            onAlternar={() => actualizar(i, { elegida: !l.elegida })}
            onDosis={(v) => actualizar(i, { dosisEditada: v })}
            onFrecuencia={(v) => actualizar(i, { frecuenciaEditada: v })}
            onBuscarAMano={() => router.push(`/paciente/${pacienteId}/agregar-farmaco` as never)}
          />
        ))}

        {faltaPauta > 0 ? (
          <Superficie elevacion="plana" className="mb-3 px-3.5 py-3">
            <Text className="font-sans text-meta leading-5 text-ink-suave">
              {faltaPauta === 1 ? 'Una línea elegida no tiene' : `${faltaPauta} líneas elegidas no tienen`}{' '}
              dosis o frecuencia. Completalas para poder agregarlas.
            </Text>
          </Superficie>
        ) : null}
      </ScrollView>

      <View className="border-t border-line bg-surface px-4 py-3">
        <Boton
          onPress={() => confirmar.mutate()}
          cargando={confirmar.isPending}
          deshabilitado={listas.length === 0}
        >
          {listas.length === 0
            ? 'Elegí al menos una línea'
            : `Agregar ${listas.length} al tratamiento`}
        </Boton>
      </View>
    </KeyboardAvoidingView>
  );
}

function FilaLinea({
  linea: l,
  onAlternar,
  onDosis,
  onFrecuencia,
  onBuscarAMano,
}: {
  linea: LineaRevisada;
  onAlternar: () => void;
  onDosis: (v: string) => void;
  onFrecuencia: (v: string) => void;
  onBuscarAMano: () => void;
}) {
  const col = useColores();

  if (l.requiereBusquedaManual) {
    return (
      <Superficie
        elevacion="plana"
        className="mb-2.5 px-3.5 py-3"
        style={{ borderLeftWidth: 4, borderLeftColor: COLOR_SEVERIDAD.media }}
      >
        <Text className="font-sans text-meta italic text-tenue">«{l.textoOriginal}»</Text>
        <Text className="mt-1 text-body font-medio" style={{ color: COLOR_SEVERIDAD.media }}>
          Sin coincidencia en el catálogo
        </Text>
        {/* Antes decía "buscalo a mano" y no llevaba a ningún lado. */}
        <View className="mt-2.5">
          <Boton variante="secundario" onPress={onBuscarAMano}>
            Buscarlo a mano
          </Boton>
        </View>
      </Superficie>
    );
  }

  return (
    <Superficie
      elevacion="plana"
      className="mb-2.5 flex-row px-3.5 py-3"
      style={l.elegida ? { borderWidth: 1, borderColor: col.primary } : undefined}
    >
      {/* Casilla y no un chip "Aceptar": esto es la confirmación línea por
          línea de la regla 2, y tiene que leerse como tal. */}
      <Pressable
        onPress={onAlternar}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: l.elegida }}
        accessibilityLabel={`Elegir ${l.nombreSugerido ?? l.textoOriginal}`}
        className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-[5px] border-2"
        style={{
          borderColor: l.elegida ? col.primary : col.tenue,
          backgroundColor: l.elegida ? col.primary : 'transparent',
        }}
      >
        {l.elegida ? <Icono nombre="check" tamano={13} color="#FFFFFF" /> : null}
      </Pressable>

      <View className="flex-1">
        <Text className="font-sans text-meta italic text-tenue">«{l.textoOriginal}»</Text>
        <Text className="mt-0.5 text-body font-medio text-ink">{l.nombreSugerido}</Text>

        {l.elegida ? (
          <View className="mt-2.5 flex-row gap-2.5">
            <View className="flex-1">
              <CampoTexto
                etiqueta="Dosis"
                value={l.dosisEditada}
                onChangeText={onDosis}
                placeholder="sin detectar"
              />
            </View>
            <View className="flex-1">
              <CampoTexto
                etiqueta="Frecuencia"
                value={l.frecuenciaEditada}
                onChangeText={onFrecuencia}
                placeholder="sin detectar"
              />
            </View>
          </View>
        ) : (
          <Text className="font-sans mt-0.5 text-meta text-ink-suave">
            {l.dosis ?? 'dosis sin detectar'} · {l.frecuencia ?? 'frecuencia sin detectar'}
          </Text>
        )}
      </View>
    </Superficie>
  );
}
