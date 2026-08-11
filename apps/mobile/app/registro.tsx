import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { api, iniciarSesion } from '@/api/cliente';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Boton, CampoTexto } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
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

  const listo =
    Boolean(c.nombre.trim() && c.apellido.trim() && c.email.trim() && c.nombreUsuario.trim()) &&
    c.password.length > 0;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-4 pb-4 pt-3" keyboardShouldPersistTaps="handled">
        <BloqueFormulario titulo="Quién sos" exigencia="Obligatorio">
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
        </BloqueFormulario>

        <BloqueFormulario titulo="Para entrar" exigencia="Obligatorio">
          <CampoTexto
            etiqueta="Nombre de usuario"
            value={c.nombreUsuario}
            onChangeText={campo('nombreUsuario')}
            autoCapitalize="none"
          />
          {/* La regla de formato deja de vivir en el placeholder, que se borra
              apenas se escribe la primera letra. Y se dice que es definitivo:
              hoy eso se descubre recién en Perfil. */}
          <Text className="font-sans -mt-2 mb-3.5 px-1 text-meta leading-4 text-ink-suave">
            Letras, números, punto, guion y guion bajo. No se puede cambiar después.
          </Text>

          <CampoTexto
            etiqueta="Contraseña"
            value={c.password}
            onChangeText={campo('password')}
            secureTextEntry
            placeholder="Mínimo 10 caracteres"
          />
          <CampoTexto
            etiqueta="Repetir"
            value={c.confirmar}
            onChangeText={campo('confirmar')}
            secureTextEntry
          />
        </BloqueFormulario>

        {/* Decía "El acceso es de pago desde el primer día, sin prueba
            gratuita". Era verdad antes del plan gratis, y quedó contradiciendo
            al paywall — que sí ofrece un paciente sin pagar. */}
        <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3">
          <Text className="font-sans text-meta leading-5 text-ink-suave">
            Empezás con el plan gratis: un paciente, con todas las verificaciones. Cuando quieras el
            segundo, ahí se elige plan.
          </Text>
        </Superficie>

        {error ? (
          <Text className="font-sans mb-1 px-1 text-meta" style={{ color: col.peligro }}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View className="border-t border-line bg-surface px-4 py-3">
        <Boton onPress={enviar} cargando={enviando} deshabilitado={!listo}>
          Crear cuenta
        </Boton>
      </View>
    </KeyboardAvoidingView>
  );
}
