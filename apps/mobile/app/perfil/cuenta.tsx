import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { api } from '@/api/cliente';
import { Boton, CampoTexto, Cargando, Pantalla } from '@/ui/kit';

interface Perfil {
  email: string;
  nombreUsuario: string;
  nombre: string;
  apellido: string;
  rol: string;
}

/** Editar cuenta (6.2). El nombre de usuario no se cambia: es identificador de
 *  login y cambiarlo rompería sesiones y referencias. */
export default function Cuenta() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['perfil'], queryFn: () => api.get<Perfil>('/auth/yo') });

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
      api.patch('/perfil/datos', {
        nombre: c.nombre.trim(),
        apellido: c.apellido.trim(),
        email: c.email.trim().toLowerCase(),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['perfil'] });
      router.back();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar.'),
  });

  if (isLoading) return <Cargando />;

  const campo = (k: keyof typeof c) => (v: string) => setC((p) => ({ ...p, [k]: v }));

  return (
    <Pantalla>
      <CampoTexto etiqueta="Nombre" value={c.nombre} onChangeText={campo('nombre')} />
      <CampoTexto etiqueta="Apellido" value={c.apellido} onChangeText={campo('apellido')} />
      <CampoTexto
        etiqueta="Email"
        value={c.email}
        onChangeText={campo('email')}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text className="font-sans mb-4 px-1 text-meta text-ink-suave">
        Usuario: {data?.nombreUsuario} · no se puede cambiar.
      </Text>

      {error ? (
        <Text className="font-sans mb-3 text-meta" style={{ color: '#991B1B' }}>
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
  );
}
