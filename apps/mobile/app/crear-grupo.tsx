import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { CampoTexto, Pantalla } from '@/ui/kit';
import { useColores } from '@/ui/tema';

/** Crear grupo (2.4). Un grupo es organización libre: no tiene semántica clínica. */
export default function CrearGrupo() {
  const col = useColores();

  const router = useRouter();
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const crear = async () => {
    setEnviando(true);
    setError(null);
    try {
      await API.crearGrupo(nombre.trim());
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el grupo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoApp />
      <Pantalla>
        <View className="items-center px-4 pb-2 pt-4">
          <View
            className="mb-3 items-center justify-center rounded-full"
            style={{ width: 64, height: 64, backgroundColor: col.paper }}
          >
            <Icono nombre="grupos" tamano={26} color="#005228" />
          </View>
          <Text className="text-fila font-fuerte text-ink">Crear Grupo</Text>
          <Text className="font-sans mt-2 text-center text-body leading-6 text-ink-suave">
            Organizá a tus pacientes por consultorio, sala o cualquier criterio que uses.
          </Text>
        </View>

        <View className="mt-6">
          <CampoTexto
            etiqueta="Nombre del grupo"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej. Hipertensos Sector B"
          />
        </View>

        {error ? (
          <Text className="font-sans mb-3 text-meta" style={{ color: col.peligro }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={crear}
          disabled={enviando || nombre.trim().length === 0}
          accessibilityRole="button"
          className="mt-2 h-[52px] flex-row items-center justify-center gap-2 rounded-full"
          style={{ backgroundColor: '#005228', opacity: enviando || nombre.trim().length === 0 ? 0.55 : 1 }}
        >
          {enviando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-meta font-medio text-white">Crear grupo</Text>
              <Icono nombre="mas" tamano={14} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </Pantalla>
    </View>
  );
}
