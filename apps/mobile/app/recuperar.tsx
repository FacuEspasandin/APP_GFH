import { useState } from 'react';
import { Text } from 'react-native';

import { AvisoNeutro, Boton, CampoTexto, Pantalla } from '@/ui/kit';

/**
 * Recuperar contraseña (1.5 / 1.6).
 *
 * El backend todavía no tiene el flujo de recuperación — hace falta el
 * proveedor de email (Resend o Postmark) y el token de un solo uso. La
 * pantalla existe y avisa; NO simula un envío que no ocurre.
 */
export default function Recuperar() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);

  return (
    <Pantalla>
      <Text className="font-sans mb-4 text-meta leading-5 text-ink-suave">
        Te mandamos un enlace para elegir una contraseña nueva.
      </Text>

      <CampoTexto
        etiqueta="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="tu@email.com"
      />

      <Boton onPress={() => setEnviado(true)} deshabilitado={email.length < 5}>
        Enviar enlace
      </Boton>

      {enviado ? (
        <AvisoNeutro>
          El envío de emails todavía no está conectado: falta configurar el proveedor y el token de
          un solo uso. Por ahora el restablecimiento se pide por soporte.
        </AvisoNeutro>
      ) : null}
    </Pantalla>
  );
}
