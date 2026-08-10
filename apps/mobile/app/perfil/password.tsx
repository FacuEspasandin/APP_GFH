import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { api, cerrarSesionLocal } from '@/api/cliente';
import { AvisoNeutro, Boton, CampoTexto, Pantalla } from '@/ui/kit';

/** Cambiar contraseña (6.3). Cambia la clave y cierra todas las sesiones. */
export default function CambiarPassword() {
  const router = useRouter();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = async () => {
    setError(null);
    if (nueva !== confirmar) return setError('Las contraseñas nuevas no coinciden.');
    if (nueva.length < 10) return setError('La contraseña necesita al menos 10 caracteres.');
    setEnviando(true);
    try {
      await api.post('/auth/password', { actual, nueva });
      // El backend revoca todas las sesiones, así que hay que volver a entrar.
      await cerrarSesionLocal();
      router.replace('/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <CampoTexto etiqueta="Contraseña actual" value={actual} onChangeText={setActual} secureTextEntry />
      <CampoTexto etiqueta="Nueva contraseña" value={nueva} onChangeText={setNueva} secureTextEntry />
      <CampoTexto etiqueta="Repetir la nueva" value={confirmar} onChangeText={setConfirmar} secureTextEntry />

      {error ? (
        <Text className="font-sans mb-3 text-meta" style={{ color: '#991B1B' }}>
          {error}
        </Text>
      ) : null}

      <Boton onPress={cambiar} cargando={enviando} deshabilitado={!actual || !nueva}>
        Cambiar contraseña
      </Boton>

      <AvisoNeutro>
        Al cambiarla se cierran todas las sesiones, incluida esta. Si alguien más tenía acceso, deja
        de tenerlo.
      </AvisoNeutro>
    </Pantalla>
  );
}
