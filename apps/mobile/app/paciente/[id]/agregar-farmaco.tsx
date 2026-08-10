import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api, ErrorApi } from '@/api/cliente';
import { hapticaAdvertencia, hapticaBloqueo, hapticaExito } from '@/ui/haptica';
import { AvisoNeutro, Boton, CampoTexto, Card, Chip, Eyebrow, Pantalla } from '@/ui/kit';

interface Producto {
  id: string;
  nombreComercial: string;
  laboratorio: string | null;
  dosisTexto: string | null;
  esGenerico: boolean;
  principiosActivos: string[];
}

const VIAS = ['ORAL', 'IV', 'SC', 'IM', 'TOPICA', 'INHALATORIA', 'SUBLINGUAL', 'RECTAL'] as const;

/**
 * Agregar fármaco (3.2.x). Se busca y se prescribe por PRODUCTO COMERCIAL.
 *
 * El 409 por alergia tiene dos sabores distintos y no se pueden mezclar:
 * `ALERGIA_BLOQUEA` no deja continuar, `ALERGIA_REQUIERE_CONFIRMACION` sí, con
 * confirmación explícita del médico.
 */
export default function AgregarFarmaco() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [consulta, setConsulta] = useState('');
  const [producto, setProducto] = useState<Producto | null>(null);
  const [libre, setLibre] = useState(false);
  const [nombreLibre, setNombreLibre] = useState('');
  const [f, setF] = useState({ dosis: '', frecuencia: '', indicacion: '' });
  const [via, setVia] = useState<(typeof VIAS)[number]>('ORAL');
  const [conflicto, setConflicto] = useState<{ codigo: string; mensaje: string } | null>(null);

  const { data: sugerencias } = useQuery({
    queryKey: ['productos', consulta],
    queryFn: () => api.get<Producto[]>(`/catalogo/productos?q=${encodeURIComponent(consulta)}`),
    enabled: consulta.trim().length >= 2 && !producto && !libre,
  });

  const crear = useMutation({
    mutationFn: (confirmar: boolean) =>
      api.post(`/pacientes/${pacienteId}/prescripciones`, {
        ...(libre
          ? { esFarmacoLibre: true, nombreLibre: nombreLibre.trim() }
          : { productoComercialId: producto?.id }),
        dosis: f.dosis.trim(),
        frecuencia: f.frecuencia.trim(),
        via,
        ...(f.indicacion.trim() ? { indicacion: f.indicacion.trim() } : {}),
        ...(confirmar ? { confirmarAlergiaCruzada: true } : {}),
      }),
    onSuccess: async () => {
      hapticaExito();
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      router.back();
    },
    onError: (e) => {
      if (e instanceof ErrorApi && e.status === 409) {
        // El bloqueo por alergia grave exacta se siente distinto de la
        // confirmación por cruce de familia: son decisiones distintas y el
        // médico las distingue antes de leer.
        if (e.codigo === 'ALERGIA_BLOQUEA') hapticaBloqueo();
        else hapticaAdvertencia();
        setConflicto({ codigo: e.codigo, mensaje: e.message });
      }
    },
  });

  const listo = (libre ? nombreLibre.trim().length > 1 : producto !== null) && f.dosis && f.frecuencia;

  return (
    <Pantalla>
      <View className="mb-4 flex-row gap-2">
        <Chip texto="Del catálogo" activo={!libre} onPress={() => setLibre(false)} />
        <Chip texto="Fármaco libre" activo={libre} onPress={() => setLibre(true)} />
      </View>

      {libre ? (
        <>
          <CampoTexto etiqueta="Nombre" value={nombreLibre} onChangeText={setNombreLibre} />
          <AvisoNeutro>Se guarda, pero no se verifica: no está en el catálogo.</AvisoNeutro>
        </>
      ) : producto ? (
        <Card className="mb-4 px-3.5 py-3">
          <Text className="text-body font-medio text-ink">
            {producto.nombreComercial}
            {producto.dosisTexto ? ` · ${producto.dosisTexto}` : ''}
          </Text>
          <Text className="font-sans mt-0.5 text-meta text-ink-suave">{producto.principiosActivos.join(' + ')}</Text>
          <Pressable onPress={() => setProducto(null)} accessibilityRole="button" className="mt-2">
            <Text className="text-meta font-medio text-accent">Cambiar</Text>
          </Pressable>
        </Card>
      ) : (
        <>
          <CampoTexto
            etiqueta="Buscar producto"
            value={consulta}
            onChangeText={setConsulta}
            placeholder="Marca, ej. Eliquis"
            autoCapitalize="none"
          />
          {sugerencias?.slice(0, 8).map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setProducto(p)}
              accessibilityRole="button"
              className="mb-2 rounded-card border border-line bg-surface px-3.5 py-2.5"
            >
              <Text className="font-sans text-body text-ink">
                {p.nombreComercial}
                {p.dosisTexto ? ` · ${p.dosisTexto}` : ''}
              </Text>
              <Text className="font-sans text-meta text-ink-suave">
                {p.esGenerico ? 'Genérico' : p.principiosActivos.join(' + ')}
              </Text>
            </Pressable>
          ))}
        </>
      )}

      <Eyebrow>Pauta</Eyebrow>
      <CampoTexto etiqueta="Dosis" value={f.dosis} onChangeText={(v) => setF((p) => ({ ...p, dosis: v }))} placeholder="5 mg" />
      <CampoTexto
        etiqueta="Frecuencia"
        value={f.frecuencia}
        onChangeText={(v) => setF((p) => ({ ...p, frecuencia: v }))}
        placeholder="cada 12 h"
      />
      <Eyebrow>Vía</Eyebrow>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {VIAS.map((v) => (
          <Chip key={v} texto={v} activo={via === v} onPress={() => setVia(v)} />
        ))}
      </View>
      <CampoTexto
        etiqueta="Indicación (opcional)"
        value={f.indicacion}
        onChangeText={(v) => setF((p) => ({ ...p, indicacion: v }))}
      />

      {conflicto ? (
        <View
          className="mb-4 rounded-card border border-line bg-surface px-3.5 py-3"
          style={{ borderLeftWidth: 4, borderLeftColor: conflicto.codigo === 'ALERGIA_BLOQUEA' ? '#EF4444' : '#F59E0B' }}
        >
          <Text className="text-body font-medio text-ink">
            {conflicto.codigo === 'ALERGIA_BLOQUEA' ? 'No se puede prescribir' : 'Alergia relacionada'}
          </Text>
          <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">{conflicto.mensaje}</Text>
          {conflicto.codigo !== 'ALERGIA_BLOQUEA' ? (
            <View className="mt-3">
              <Boton variante="secundario" onPress={() => crear.mutate(true)} cargando={crear.isPending}>
                Confirmar y agregar igual
              </Boton>
            </View>
          ) : null}
        </View>
      ) : null}

      <Boton
        onPress={() => {
          setConflicto(null);
          crear.mutate(false);
        }}
        cargando={crear.isPending}
        deshabilitado={!listo || conflicto?.codigo === 'ALERGIA_BLOQUEA'}
      >
        Agregar al tratamiento
      </Boton>
    </Pantalla>
  );
}
