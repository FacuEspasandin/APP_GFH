import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorApi } from '@/api/cliente';
import * as API from '@/api/endpoints';
import {
  elegidasSinPauta,
  elegirTodas,
  listasParaCrear,
} from '@/dominio/carga-tratamiento';
import { ConsultaPlegada, Veredicto } from '@/ui/herramienta';
import { Icono } from '@/ui/iconos';
import { Boton, CampoTexto, Chip } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { COLOR_SEVERIDAD, VIAS_OFRECIDAS, viaCorta } from '@gfh/shared-types';

/** Cerrar + título, blanco — flujo lineal, sin la marca "GFH" ni la barra
 *  inferior (ver `SIN_MENU_SUBRUTA_PACIENTE` en `menu-inferior.tsx`). */
function EncabezadoTransaccional({ titulo }: { titulo: string }) {
  const col = useColores();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center gap-2 border-b px-2"
      style={{ paddingTop: insets.top, backgroundColor: col.surface, borderColor: col.line }}
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        hitSlop={8}
        className="h-16 w-12 items-center justify-center"
      >
        <Icono nombre="cerrar" tamano={16} color={col.ink} />
      </Pressable>
      <Text className="text-fila font-fuerte text-ink">{titulo}</Text>
    </View>
  );
}

interface Linea {
  textoOriginal: string;
  productoComercialIdSugerido: string | null;
  nombreSugerido: string | null;
  dosis: string | null;
  frecuencia: string | null;
  /** Sugerida por el backend a partir del texto (`extraerVia`, en
   *  `foto.service.ts`) — `null` cuando no hay ninguna pista. */
  via: string | null;
  requiereBusquedaManual: boolean;
}

/** Lo que el médico revisa y puede corregir antes de que se cree nada. */
interface LineaRevisada extends Linea {
  elegida: boolean;
  dosisEditada: string;
  frecuenciaEditada: string;
  /**
   * Nunca queda sin valor — a diferencia de dosis/frecuencia, `via` es
   * obligatoria para crear la prescripción (`CrearPrescripcionDto.via`), así
   * que sin pista del texto cae en "ORAL" y no en vacío. Es la misma vía que
   * el motor usa para elegir el ajuste renal/hepático correcto
   * (`elegirAjustePorVia`): antes de esto, cargar por texto o por foto mandaba
   * "oral" siempre, sin mirar lo que decía la línea.
   */
  viaEditada: string;
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
  // Sólo para el copy del resumen en el paso 2 — "líneas pegadas" no tiene
  // sentido cuando vinieron de una foto.
  const [origen, setOrigen] = useState<'texto' | 'foto'>('texto');

  const textos = crudo
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  // Nada viene elegido por default: el médico confirma cada línea. Mismo
  // punto de entrada para las líneas que salen de pegar texto y las que
  // salen de una foto — la revisión de la regla 2 no distingue de dónde vino
  // el texto.
  const aRevisadas = (ls: Linea[]): LineaRevisada[] =>
    ls.map((l) => ({
      ...l,
      elegida: false,
      dosisEditada: l.dosis ?? '',
      frecuenciaEditada: l.frecuencia ?? '',
      viaEditada: l.via ?? 'ORAL',
    }));

  const matchear = useMutation({
    mutationFn: () => API.matchearLineas<Linea[]>(pacienteId, textos),
    onSuccess: (r) => {
      setOrigen('texto');
      setLineas(aRevisadas(r));
    },
  });

  const subirFoto = useMutation({
    mutationFn: (imagenBase64: string) => API.subirFoto<Linea[]>(pacienteId, imagenBase64),
    onMutate: () => setErrorFoto(null),
    onSuccess: (r) => {
      setOrigen('foto');
      setLineas(aRevisadas(r));
    },
    onError: (e) =>
      setErrorFoto(e instanceof ErrorApi ? e.message : 'No se pudo procesar la foto. Cargá el tratamiento a mano.'),
  });

  /**
   * Cámara o galería → comprimir/redimensionar → mandar al backend.
   *
   * El resize a 1600px de ancho no es sólo para que pese menos: una imagen de
   * tamaño consistente es la que mejor lee el OCR — una foto de 12 Mpx sin
   * tocar no reconoce más letras, tarda más en subir y en procesarse.
   */
  const elegirDesdeFoto = async (origen: 'camara' | 'galeria') => {
    const permiso =
      origen === 'camara'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      setErrorFoto('Sin permiso para usar la cámara o la galería. Habilitalo en Ajustes del teléfono.');
      return;
    }

    const resultado =
      origen === 'camara'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });

    if (resultado.canceled) return;

    const foto = resultado.assets[0];
    if (!foto) return;

    setErrorFoto(null);
    // `manipulateAsync` sigue siendo la forma más simple para un resize +
    // compresión de una sola vez — la API nueva por contexto (`manipulate`)
    // está pensada para cadenas de edición más largas, que acá no hacen falta.
    const comprimida = await ImageManipulator.manipulateAsync(foto.uri, [{ resize: { width: 1600 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });

    if (!comprimida.base64) {
      setErrorFoto('No se pudo leer la foto. Probá de nuevo.');
      return;
    }

    subirFoto.mutate(comprimida.base64);
  };

  const confirmar = useMutation({
    mutationFn: async () => {
      for (const l of listasParaCrear(lineas ?? [])) {
        await API.agregarPrescripcion(pacienteId, {
          productoComercialId: l.productoComercialIdSugerido,
          // Lo que el médico dejó escrito, no un literal. Antes, sin dosis
          // detectada, se creaba la prescripción con el texto "a confirmar"
          // adentro del campo dosis y nadie volvía a mirarla.
          dosis: l.dosisEditada.trim(),
          frecuencia: l.frecuenciaEditada.trim(),
          via: l.viaEditada,
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
      <View className="flex-1 bg-paper">
        <EncabezadoTransaccional titulo="Cargar Tratamiento" />
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="px-4 pb-4 pt-4" keyboardShouldPersistTaps="handled">
          <PasoNumerado n={1} titulo="Pegar lista de medicamentos" />
          <Text className="font-sans -mt-2 mb-3 text-meta leading-5 text-ink-suave">
            Copiá y pegá la lista desde la historia clínica o receta digital.
          </Text>

          <View className="mb-1">
            <TextInput
              value={crudo}
              onChangeText={setCrudo}
              multiline
              placeholder={'Eliquis 5 mg cada 12 h\nIbupirac 600 mg cada 8 h'}
              placeholderTextColor={col.tenue}
              accessibilityLabel="Listado de medicación"
              className="min-h-[140px] rounded-xl border border-line bg-surface px-4 py-4 text-body text-ink"
              style={{ textAlignVertical: 'top' }}
            />
            <Pressable
              onPress={() => void elegirDesdeFoto('camara')}
              disabled={subirFoto.isPending}
              accessibilityRole="button"
              accessibilityLabel="Cargar desde una foto"
              className="absolute bottom-3 right-3 flex-row items-center gap-1.5 rounded-full px-3.5 py-2"
              style={{ backgroundColor: col.paper, borderWidth: 1, borderColor: col.line }}
            >
              <Icono nombre="camara" tamano={16} color="#005228" />
              <Text className="font-fuerte text-[11px] uppercase tracking-wider" style={{ color: '#005228' }}>
                {subirFoto.isPending ? 'Leyendo la foto…' : 'Desde una foto'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => void elegirDesdeFoto('galeria')}
            disabled={subirFoto.isPending}
            accessibilityRole="button"
            className="mb-3 items-center py-1"
          >
            <Text className="font-medio text-meta text-accent">O elegir una foto de la galería</Text>
          </Pressable>

          {/* La foto se procesa y se descarta: no se guarda nunca. */}
          {errorFoto ? (
            <Superficie elevacion="plana" className="mb-3 px-3.5 py-3">
              <Text className="font-sans text-meta leading-5 text-ink-suave">{errorFoto}</Text>
            </Superficie>
          ) : null}
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
      </View>
    );
  }

  // --- paso 2: revisar -----------------------------------------------------
  const elegidas = lineas.filter((l) => l.elegida);
  const reconocidas = lineas.filter((l) => !l.requiereBusquedaManual);
  const sinMatch = lineas.length - reconocidas.length;

  const listas = listasParaCrear(lineas);
  const faltaPauta = elegidasSinPauta(lineas);

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoTransaccional titulo="Cargar Tratamiento" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ConsultaPlegada
        titulo={`${lineas.length} ${
          origen === 'foto'
            ? lineas.length === 1
              ? 'línea leída de la foto'
              : 'líneas leídas de la foto'
            : lineas.length === 1
              ? 'línea pegada'
              : 'líneas pegadas'
        }`}
        detalle={
          sinMatch === 0
            ? 'Todas reconocidas'
            : `${reconocidas.length} reconocidas · ${sinMatch} sin coincidencia`
        }
        onCambiar={() => setLineas(null)}
      />

      <ScrollView contentContainerClassName="px-4 pb-4 pt-4" keyboardShouldPersistTaps="handled">
        <PasoNumerado n={2} titulo="Revisar y completar" />
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
              setLineas((ls) => elegirTodas(ls ?? []))
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
            onVia={(v) => actualizar(i, { viaEditada: v })}
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
    </View>
  );
}

function FilaLinea({
  linea: l,
  onAlternar,
  onDosis,
  onFrecuencia,
  onVia,
  onBuscarAMano,
}: {
  linea: LineaRevisada;
  onAlternar: () => void;
  onDosis: (v: string) => void;
  onFrecuencia: (v: string) => void;
  onVia: (v: string) => void;
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
          <>
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

            {/* Sin esto, cada línea cargada por texto o por foto quedaba fija
                en oral — la misma vía que usa el motor para el ajuste renal y
                hepático correctos. Se ve sólo al elegir la línea, igual que
                dosis y frecuencia. */}
            <Text className="mb-1.5 mt-2.5 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
              Vía
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {VIAS_OFRECIDAS.map((v) => (
                <Chip key={v} texto={viaCorta(v)} activo={l.viaEditada === v} onPress={() => onVia(v)} />
              ))}
            </View>
          </>
        ) : (
          <Text className="font-sans mt-0.5 text-meta text-ink-suave">
            {viaCorta(l.viaEditada)} · {l.dosis ?? 'dosis sin detectar'} · {l.frecuencia ?? 'frecuencia sin detectar'}
          </Text>
        )}
      </View>
    </Superficie>
  );
}

/** El numerito de paso — cada pantalla muestra el suyo, siempre "activo": no
 *  hay una vista combinada de los dos pasos, así que no hace falta el estado
 *  "pendiente" que sí tiene sentido en un mock estático de Figma. */
function PasoNumerado({ n, titulo }: { n: number; titulo: string }) {
  return (
    <View className="mb-2 flex-row items-center gap-2">
      <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: '#005228' }}>
        <Text className="font-medio text-eyebrow text-white">{n}</Text>
      </View>
      <Text className="text-fila font-fuerte text-ink">{titulo}</Text>
    </View>
  );
}
