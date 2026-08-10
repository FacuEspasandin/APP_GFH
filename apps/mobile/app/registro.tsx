import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { api, iniciarSesion } from '@/api/cliente';
import { AvisoNeutro, Boton, CampoTexto, Pantalla } from '@/ui/kit';
import { useColores } from '@/ui/tema';

/** Registro (1.4). Nombre de usuario único + email + contraseña. */
export default function Registro() {
  const col = useColores();

  const router = useRouter();
  const [c, setC] = useState({
    nombre: '',
    apellido: '',
    nombreUsuario: '',
    email: '',
    password: '',
    confirmar: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setError(null);
    if (c.password !== c.confirmar) return setError('Las contraseñas no coinciden.');
    if (c.password.length < 10) return setError('La contraseña necesita al menos 10 caracteres.');

    setEnviando(true);
    try {
      await api.post('/auth/registro', {
        nombre: c.nombre,
        apellido: c.apellido,
        nombreUsuario: c.nombreUsuario,
        email: c.email,
        password: c.password,
      });
      // El registro ya devuelve tokens, pero se hace login para reusar el
      // mismo camino de guardado y no duplicar la lógica de sesión.
      await iniciarSesion(c.email, c.password);
      router.replace('/disclaimer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta.');
    } finally {
      setEnviando(false);
    }
  };

  const campo = (k: keyof typeof c) => (v: string) => setC((p) => ({ ...p, [k]: v }));

  return (
    <Pantalla>
      <CampoTexto etiqueta="Nombre" value={c.nombre} onChangeText={campo('nombre')} />
      <CampoTexto etiqueta="Apellido" value={c.apellido} onChangeText={campo('apellido')} />
      <CampoTexto
        etiqueta="Nombre de usuario"
        value={c.nombreUsuario}
        onChangeText={campo('nombreUsuario')}
        autoCapitalize="none"
        placeholder="solo letras, números, . _ -"
      />
      <CampoTexto
        etiqueta="Email"
        value={c.email}
        onChangeText={campo('email')}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <CampoTexto
        etiqueta="Contraseña"
        value={c.password}
        onChangeText={campo('password')}
        secureTextEntry
        placeholder="mínimo 10 caracteres"
      />
      <CampoTexto
        etiqueta="Confirmar contraseña"
        value={c.confirmar}
        onChangeText={campo('confirmar')}
        secureTextEntry
      />

      {error ? (
        <Text className="font-sans mb-3 text-meta" style={{ color: col.peligro }}>
          {error}
        </Text>
      ) : null}

      <Boton onPress={enviar} cargando={enviando}>
        Crear cuenta
      </Boton>

      <View className="mt-4">
        <AvisoNeutro>
          El acceso es de pago desde el primer día, sin prueba gratuita. Después de crear la cuenta
          se elige el plan.
        </AvisoNeutro>
      </View>
    </Pantalla>
  );
}
