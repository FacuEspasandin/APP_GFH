import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { AvisoNeutro, Boton, CampoTexto, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Recuperar contraseña (1.5), paso 1: pedir el código.
 *
 * El backend responde siempre igual, exista o no la cuenta —ver
 * `AuthService.solicitarRecuperacion`—, así que esta pantalla hace lo mismo:
 * nunca dice "esa cuenta no existe". Decirlo permitiría probar emails uno por
 * uno hasta encontrar cuáles están registrados. Por eso siempre sigue al paso
 * 2, tenga cuenta el email o no.
 */
export default function Recuperar() {
  const col = useColores();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const irACodigo = () =>
    router.push({ pathname: '/recuperar-confirmar', params: { email: email.trim() } });

  const enviar = async () => {
    setError(null);
    setEnviando(true);
    try {
      await API.pedirRecuperacion(email.trim());
      irACodigo();
    } catch (e) {
      // El único motivo por el que esto puede fallar es de red o de límite de
      // intentos — nunca "esa cuenta no existe", eso el backend no lo dice.
      setError(e instanceof Error ? e.message : 'No se pudo enviar. Probá de nuevo en un rato.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Recuperar Contraseña" />
      <Pantalla>
        <Superficie elevacion="plana" className="mb-4 border p-4" style={{ borderColor: col.line }}>
          <Text className="mb-2 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            Email de tu cuenta
          </Text>
          <CampoTexto
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="tu@email.com"
          />
        </Superficie>

        {error ? (
          <Text className="font-sans mb-3 text-meta" style={{ color: col.peligro }}>
            {error}
          </Text>
        ) : null}

        <Boton onPress={enviar} cargando={enviando} deshabilitado={!email.trim()}>
          Enviar código
        </Boton>

        <Pressable
          onPress={irACodigo}
          disabled={!email.trim()}
          accessibilityRole="button"
          className="mt-4 items-center py-2"
          style={{ opacity: email.trim() ? 1 : 0.4 }}
        >
          <Text className="font-sans text-meta" style={{ color: col.primary }}>
            Ya tengo un código
          </Text>
        </Pressable>

        <AvisoNeutro>
          Te mandamos por email un código de 6 dígitos, válido 15 minutos. Lo escribís en la
          pantalla siguiente.
        </AvisoNeutro>
      </Pantalla>
    </View>
  );
}
