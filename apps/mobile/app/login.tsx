import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { iniciarSesion } from '@/api/cliente';
import { Disclaimer } from '@/ui/disclaimer';

const esquema = z.object({
  identificador: z.string().min(3, 'Ingresá tu email.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
});

type Campos = z.infer<typeof esquema>;

export default function Login() {
  const router = useRouter();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { identificador: '', password: '' },
  });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      await iniciarSesion(datos.identificador.trim(), datos.password);
      router.replace('/(tabs)');
    } catch (e) {
      setErrorServidor(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    }
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10">
        <View className="mb-10 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-card bg-primary">
            <Text className="text-lg font-fuerte tracking-widest text-white">GFH</Text>
          </View>
          <Text className="mt-4 text-grande font-fuerte text-ink">Iniciar sesión</Text>
          <Text className="font-sans mt-1 text-meta text-ink-suave">
            Verificación clínica para tus pacientes.
          </Text>
        </View>

        <Campo
          control={control}
          nombre="identificador"
          etiqueta="Email"
          placeholder="tu@email.com"
          error={errors.identificador?.message}
          teclado="email-address"
        />
        <Campo
          control={control}
          nombre="password"
          etiqueta="Contraseña"
          placeholder="••••••••"
          error={errors.password?.message}
          secreto
        />

        {errorServidor ? (
          <View className="mt-2 rounded-chip border border-line bg-surface p-3">
            <Text className="font-sans text-meta" style={{ color: '#991B1B' }}>
              {errorServidor}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={enviar}
          disabled={isSubmitting}
          className="mt-6 h-12 flex-row items-center justify-center rounded-chip bg-primary active:bg-primary-hover"
          style={{ opacity: isSubmitting ? 0.6 : 1 }}
          accessibilityRole="button"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-body font-fuerte text-white">Entrar</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.push('/recuperar')}
          accessibilityRole="button"
          className="mt-5 self-center"
        >
          <Text className="text-meta font-medio text-accent">Olvidé mi contraseña</Text>
        </Pressable>
      </ScrollView>

      <Disclaimer />
    </KeyboardAvoidingView>
  );
}

function Campo({
  control,
  nombre,
  etiqueta,
  placeholder,
  error,
  secreto,
  teclado,
}: {
  control: ReturnType<typeof useForm<Campos>>['control'];
  nombre: keyof Campos;
  etiqueta: string;
  placeholder: string;
  error?: string;
  secreto?: boolean;
  teclado?: 'email-address';
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-eyebrow font-medio uppercase text-ink-suave">{etiqueta}</Text>
      <Controller
        control={control}
        name={nombre}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor="#8CA39A"
            secureTextEntry={secreto}
            keyboardType={teclado}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={etiqueta}
            className="h-12 rounded-chip border border-line bg-surface px-3.5 text-body text-ink"
          />
        )}
      />
      {error ? (
        <Text className="font-sans mt-1 text-meta" style={{ color: '#991B1B' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
