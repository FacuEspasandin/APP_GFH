import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { SkeletonFormulario } from '@/ui/estados-sistema';
import { useAviso } from '@/ui/aviso';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Boton, CampoTexto, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/** Editar cuenta (6.2). El nombre de usuario no se cambia: es identificador de
 *  login y cambiarlo rompería sesiones y referencias. */
export default function Cuenta() {
  const col = useColores();

  const router = useRouter();
  const qc = useQueryClient();
  const { avisar } = useAviso();
  const { data, isLoading } = useQuery({ queryKey: ['perfil'], queryFn: API.yo });

  const [c, setC] = useState({ nombre: '', apellido: '', email: '' });
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data || cargado) return;
    setC({ nombre: data.nombre, apellido: data.apellido, email: data.email });
    setCargado(true);
  }, [data, cargado]);

  const guardar = useMutation({
    mutationFn: () =>
      API.guardarDatosMedico({
        nombre: c.nombre.trim(),
        apellido: c.apellido.trim(),
        email: c.email.trim().toLowerCase(),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['perfil'] });
      router.back();
      avisar('Datos guardados');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar.'),
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoConTitulo titulo="Datos Personales" />
        <SkeletonFormulario campos={4} />
      </View>
    );
  }

  const campo = (k: keyof typeof c) => (v: string) => setC((p) => ({ ...p, [k]: v }));

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Datos Personales" />
      <Pantalla>
        <Superficie elevacion="plana" className="mb-3 border p-4" style={{ borderColor: col.line }}>
          <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            Tus datos
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <CampoTexto etiqueta="Nombre" value={c.nombre} onChangeText={campo('nombre')} />
            </View>
            <View className="flex-1">
              <CampoTexto etiqueta="Apellido" value={c.apellido} onChangeText={campo('apellido')} />
            </View>
          </View>
          <CampoTexto
            etiqueta="Email"
            value={c.email}
            onChangeText={campo('email')}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </Superficie>

        {/* El usuario es identificador de login: cambiarlo rompería sesiones y
            referencias, así que se muestra pero no se edita. */}
        <Superficie elevacion="plana" className="mb-4 border p-4" style={{ borderColor: col.line }}>
          <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            Nombre de usuario
          </Text>
          <Text className="font-mono text-body text-ink">{data?.nombreUsuario}</Text>
          <Text className="font-sans mt-1 text-meta text-ink-suave">
            No se puede cambiar: es con lo que entrás.
          </Text>
        </Superficie>

        {error ? (
          <Text className="font-sans mb-3 text-meta" style={{ color: col.peligro }}>
            {error}
          </Text>
        ) : null}

        <Boton
          onPress={() => {
            setError(null);
            guardar.mutate();
          }}
          cargando={guardar.isPending}
          deshabilitado={!c.nombre.trim() || !c.apellido.trim() || !c.email.trim()}
        >
          Guardar
        </Boton>
      </Pantalla>
    </View>
  );
}
