import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { cerrarSesionLocal } from '@/api/cliente';
import * as API from '@/api/endpoints';
import { AvisoNeutro, Boton, CampoTexto, Pantalla } from '@/ui/kit';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/** Cambiar contraseña (6.3). Cambia la clave y cierra todas las sesiones. */
export default function CambiarPassword() {
  const col = useColores();

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
      await API.cambiarPassword({ actual, nueva });
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
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Cambiar Contraseña" />
      <Pantalla>
        <Superficie elevacion="plana" className="mb-3 border p-4" style={{ borderColor: col.line }}>
          <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            Contraseña actual
          </Text>
          <CampoTexto value={actual} onChangeText={setActual} secureTextEntry />
        </Superficie>

        <Superficie elevacion="plana" className="mb-4 border p-4" style={{ borderColor: col.line }}>
          <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            Nueva contraseña
          </Text>
          <CampoTexto etiqueta="Nueva" value={nueva} onChangeText={setNueva} secureTextEntry />
          <CampoTexto etiqueta="Repetir" value={confirmar} onChangeText={setConfirmar} secureTextEntry />
          <Text className="font-sans text-meta text-ink-suave">Al menos 10 caracteres.</Text>
        </Superficie>

        {error ? (
          <Text className="font-sans mb-3 text-meta" style={{ color: col.peligro }}>
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
    </View>
  );
}
