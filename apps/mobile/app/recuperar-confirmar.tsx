import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { AvisoNeutro, Boton, CampoTexto, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Recuperar contraseña (1.6), paso 2: el código y la contraseña nueva.
 *
 * El código llega por email y se escribe acá — nada viaja por un enlace ni
 * por un esquema propio que otra app pudiera interceptar. El email viene de
 * la pantalla anterior pero se puede corregir: quien ya tiene un código
 * entra directo, y un email mal tipeado no debería obligar a empezar de cero.
 *
 * No intenta iniciar sesión sola al terminar: el backend revoca todas las
 * sesiones al confirmar, y entrar con la contraseña recién elegida es el paso
 * que corresponde después.
 */
export default function RecuperarConfirmar() {
  const col = useColores();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const confirmarCambio = async () => {
    setError(null);
    if (!/^\d{6}$/.test(codigo)) return setError('El código tiene 6 dígitos.');
    if (nueva !== confirmar) return setError('Las contraseñas no coinciden.');
    if (nueva.length < 10) return setError('La contraseña necesita al menos 10 caracteres.');

    setEnviando(true);
    try {
      await API.confirmarRecuperacion({ email: email.trim(), codigo, nueva });
      setListo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoConTitulo titulo="Elegir Contraseña" />
        <Pantalla>
          <Superficie elevacion="media" className="mb-4 px-3.5 py-3.5">
            <Text className="text-fila font-fuerte text-ink">Contraseña actualizada</Text>
            <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">
              Se cerraron todas las sesiones activas, por las dudas. Entrá de nuevo con la
              contraseña nueva.
            </Text>
          </Superficie>
          <Boton onPress={() => router.replace('/login')}>Ir a iniciar sesión</Boton>
        </Pantalla>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Elegir Contraseña" />
      <Pantalla>
        <Superficie elevacion="plana" className="mb-3 border p-4" style={{ borderColor: col.line }}>
          <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            Código que te llegó por email
          </Text>
          <CampoTexto
            etiqueta="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <CampoTexto
            etiqueta="Código de 6 dígitos"
            value={codigo}
            onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
        </Superficie>

        <Superficie elevacion="plana" className="mb-4 border p-4" style={{ borderColor: col.line }}>
          <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            Contraseña nueva
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

        <Boton
          onPress={confirmarCambio}
          cargando={enviando}
          deshabilitado={!email.trim() || codigo.length !== 6 || !nueva || !confirmar}
        >
          Confirmar
        </Boton>

        <AvisoNeutro>
          El código vale 15 minutos y admite 5 intentos. Si se agota o vence, volvé atrás y pedí uno
          nuevo.
        </AvisoNeutro>
      </Pantalla>
    </View>
  );
}
