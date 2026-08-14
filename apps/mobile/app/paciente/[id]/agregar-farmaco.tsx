import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { api, ErrorApi } from '@/api/cliente';
import { POR_PRODUCTO, useIndiceProductos } from '@/api/catalogo';
import { buscar } from '@/dominio/busqueda';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { hapticaAdvertencia, hapticaBloqueo, hapticaExito } from '@/ui/haptica';
import { Boton, CampoTexto, Chip } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { COLOR_SEVERIDAD } from '@gfh/shared-types';

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
 *
 * El conflicto vive en el pie, pegado al botón. Antes aparecía entre el
 * formulario y la acción, con su propio botón "Confirmar y agregar igual"
 * adentro: dos botones que hacían casi lo mismo a tres centímetros uno del
 * otro. Ahora hay uno solo que cambia de texto.
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

  // El mismo índice que usa el Buscador, ya en memoria: cambiar de pantalla no
  // vuelve a bajarlo y las sugerencias salen desde la primera letra.
  const { data: catalogo } = useIndiceProductos();

  const sugerencias = useMemo(() => {
    const texto = consulta.trim();
    if (texto === '' || producto || libre) return [];
    return buscar(catalogo ?? [], texto, POR_PRODUCTO, { tope: 8 });
  }, [catalogo, consulta, producto, libre]);

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

  const listo =
    (libre ? nombreLibre.trim().length > 1 : producto !== null) && Boolean(f.dosis && f.frecuencia);

  const bloqueado = conflicto?.codigo === 'ALERGIA_BLOQUEA';
  const pideConfirmacion = conflicto !== null && !bloqueado;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-4 pb-4 pt-3" keyboardShouldPersistTaps="handled">
        <BloqueFormulario titulo="Producto" exigencia="Obligatorio">
          <View className="mb-3.5 flex-row gap-2">
            <Chip texto="Del catálogo" activo={!libre} onPress={() => setLibre(false)} />
            <Chip texto="Fármaco libre" activo={libre} onPress={() => setLibre(true)} />
          </View>

          {libre ? (
            <>
              <CampoTexto etiqueta="Nombre" value={nombreLibre} onChangeText={setNombreLibre} />
              <Text className="font-sans text-meta leading-4 text-ink-suave">
                Se guarda, pero no se verifica: no está en el catálogo.
              </Text>
            </>
          ) : producto ? (
            <View className="flex-row items-center rounded-chip bg-primary-light px-3 py-2.5">
              <View className="flex-1 pr-2">
                <Text className="text-body font-medio text-ink">
                  {producto.nombreComercial}
                  {producto.dosisTexto ? (
                    <Text className="font-sans text-ink-suave"> · {producto.dosisTexto}</Text>
                  ) : null}
                </Text>
                <Text className="font-sans text-meta text-ink-suave">
                  {producto.principiosActivos.join(' + ')}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setProducto(null);
                  setConflicto(null);
                }}
                accessibilityRole="button"
              >
                <Text className="font-medio text-meta text-accent">Cambiar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CampoTexto
                value={consulta}
                onChangeText={setConsulta}
                placeholder="Buscar por marca, ej. Eliquis"
                autoCapitalize="none"
              />
              {sugerencias.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setProducto(p)}
                  accessibilityRole="button"
                  className="border-t border-line py-2.5"
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
        </BloqueFormulario>

        <BloqueFormulario titulo="Pauta" exigencia="Obligatorio">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <CampoTexto
                etiqueta="Dosis"
                value={f.dosis}
                onChangeText={(v) => setF((p) => ({ ...p, dosis: v }))}
                placeholder="5 mg"
              />
            </View>
            <View className="flex-1">
              <CampoTexto
                etiqueta="Frecuencia"
                value={f.frecuencia}
                onChangeText={(v) => setF((p) => ({ ...p, frecuencia: v }))}
                placeholder="cada 12 h"
              />
            </View>
          </View>

          <Text className="mb-1.5 text-eyebrow font-medio uppercase tracking-wider text-ink-suave">
            Vía
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {VIAS.map((v) => (
              <Chip key={v} texto={v} activo={via === v} onPress={() => setVia(v)} />
            ))}
          </View>
        </BloqueFormulario>

        <BloqueFormulario titulo="Indicación" exigencia="Opcional">
          <CampoTexto
            value={f.indicacion}
            onChangeText={(v) => setF((p) => ({ ...p, indicacion: v }))}
            placeholder="Para qué se indica"
          />
        </BloqueFormulario>
      </ScrollView>

      <View className="border-t border-line bg-surface px-4 py-3">
        {conflicto ? (
          <Superficie
            elevacion="plana"
            className="mb-2.5 px-3.5 py-3"
            style={{
              backgroundColor: bloqueado ? '#FEF2F2' : '#FFFBEB',
              borderLeftWidth: 4,
              borderLeftColor: bloqueado ? COLOR_SEVERIDAD.grave : COLOR_SEVERIDAD.media,
            }}
          >
            <Text className="text-body font-fuerte text-ink">
              {bloqueado ? 'No se puede prescribir' : 'Alergia relacionada'}
            </Text>
            <Text className="font-sans mt-1 text-meta leading-5 text-ink-suave">
              {conflicto.mensaje}
            </Text>
          </Superficie>
        ) : null}

        {/* Un solo botón: cuando el cruce pide confirmación cambia de texto, en
            vez de aparecer un segundo botón al lado del primero. Cuando la
            alergia bloquea queda apagado y no hay forma de forzarlo. */}
        <Boton
          onPress={() => {
            if (!pideConfirmacion) setConflicto(null);
            crear.mutate(pideConfirmacion);
          }}
          cargando={crear.isPending}
          deshabilitado={!listo || bloqueado}
        >
          {pideConfirmacion ? 'Confirmar y agregar' : 'Agregar al tratamiento'}
        </Boton>
      </View>
    </KeyboardAvoidingView>
  );
}
