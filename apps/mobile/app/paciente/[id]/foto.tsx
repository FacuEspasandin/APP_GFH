import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { api, ErrorApi } from '@/api/cliente';
import { AvisoNeutro, Boton, Card, Chip, Eyebrow, Pantalla } from '@/ui/kit';

interface Linea {
  textoOriginal: string;
  productoComercialIdSugerido: string | null;
  nombreSugerido: string | null;
  dosis: string | null;
  frecuencia: string | null;
  requiereBusquedaManual: boolean;
}

/**
 * Carga de tratamiento por lista (3.3.x).
 *
 * El reconocimiento por foto necesita un proveedor de visión que todavía no
 * está configurado — el backend responde 501 y la pantalla lo dice, en vez de
 * simular una extracción.
 *
 * Lo que SÍ funciona es el resto del flujo, que es la parte que importa: pegar
 * o escribir el listado, matchearlo contra el catálogo, y **revisar línea por
 * línea antes de crear nada**. Esa revisión obligatoria es la regla no
 * negociable 2, y no depende de cómo se haya obtenido el texto.
 */
export default function CargaPorLista() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [crudo, setCrudo] = useState('');
  const [lineas, setLineas] = useState<Linea[] | null>(null);
  const [aceptadas, setAceptadas] = useState<Set<number>>(new Set());
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const matchear = useMutation({
    mutationFn: () =>
      api.post<Linea[]>(`/pacientes/${pacienteId}/lineas/matchear`, {
        textos: crudo
          .split('\n')
          .map((t) => t.trim())
          .filter((t) => t.length > 1),
      }),
    onSuccess: (r) => {
      setLineas(r);
      // Nada viene aceptado por default: el médico confirma cada línea.
      setAceptadas(new Set());
    },
  });

  const probarFoto = useMutation({
    mutationFn: () => api.post('/pacientes/' + pacienteId + '/foto', { imagenBase64: '' }),
    onError: (e) => setErrorFoto(e instanceof ErrorApi ? e.message : 'No disponible.'),
  });

  const confirmar = useMutation({
    mutationFn: async () => {
      const aCrear = (lineas ?? []).filter((_, i) => aceptadas.has(i));
      for (const l of aCrear) {
        await api.post(`/pacientes/${pacienteId}/prescripciones`, {
          productoComercialId: l.productoComercialIdSugerido,
          dosis: l.dosis ?? 'a confirmar',
          frecuencia: l.frecuencia ?? 'a confirmar',
          via: 'ORAL',
        });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      router.back();
    },
  });

  const alternar = (i: number) =>
    setAceptadas((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <Pantalla>
      <Eyebrow>Desde una foto</Eyebrow>
      <Boton variante="secundario" onPress={() => probarFoto.mutate()} cargando={probarFoto.isPending}>
        Sacar o elegir una foto
      </Boton>
      {errorFoto ? <View className="mt-2"><AvisoNeutro>{errorFoto}</AvisoNeutro></View> : null}
      <View className="mt-1">
        <AvisoNeutro>
          La foto se procesa y se descarta. No se guarda.
        </AvisoNeutro>
      </View>

      <View className="mt-4" />
      <Eyebrow>O pegá el listado</Eyebrow>
      <TextInput
        value={crudo}
        onChangeText={setCrudo}
        multiline
        numberOfLines={6}
        placeholder={'Eliquis 5 mg cada 12 h\nIbupirac 600 mg cada 8 h'}
        placeholderTextColor="#8CA39A"
        accessibilityLabel="Listado de medicación"
        className="mb-3 min-h-[120px] rounded-chip border border-line bg-surface px-3.5 py-3 text-body text-ink"
        style={{ textAlignVertical: 'top' }}
      />
      <Boton onPress={() => matchear.mutate()} cargando={matchear.isPending} deshabilitado={crudo.trim().length < 3}>
        Buscar en el catálogo
      </Boton>

      {lineas ? (
        <View className="mt-5">
          <Eyebrow>Revisá línea por línea</Eyebrow>
          <AvisoNeutro>
            Nada se carga hasta que confirmes.
          </AvisoNeutro>

          {lineas.map((l, i) => {
            const activa = aceptadas.has(i);
            return (
              <Card key={i} className="mb-2 px-3.5 py-3">
                <Text className="font-sans text-meta text-ink-suave">«{l.textoOriginal}»</Text>

                {l.requiereBusquedaManual ? (
                  <>
                    <Text className="mt-1.5 text-body font-medio" style={{ color: '#92400E' }}>
                      Sin coincidencia en el catálogo
                    </Text>
                    <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">
                      Buscalo a mano desde «Agregar fármaco».
                    </Text>
                  </>
                ) : (
                  <>
                    <Text className="mt-1.5 text-body font-medio text-ink">{l.nombreSugerido}</Text>
                    <Text className="font-sans mt-0.5 text-meta text-ink-suave">
                      {l.dosis ?? 'dosis a confirmar'} · {l.frecuencia ?? 'frecuencia a confirmar'}
                    </Text>
                    <View className="mt-2.5 flex-row gap-2">
                      <Chip texto={activa ? '✓ Aceptada' : 'Aceptar'} activo={activa} onPress={() => alternar(i)} />
                    </View>
                  </>
                )}
              </Card>
            );
          })}

          <View className="mt-2">
            <Boton
              onPress={() => confirmar.mutate()}
              cargando={confirmar.isPending}
              deshabilitado={aceptadas.size === 0}
            >
              {aceptadas.size === 0
                ? 'Aceptá al menos una línea'
                : `Crear ${aceptadas.size} prescripción${aceptadas.size === 1 ? '' : 'es'}`}
            </Boton>
          </View>
        </View>
      ) : null}
    </Pantalla>
  );
}

export { Pressable };
