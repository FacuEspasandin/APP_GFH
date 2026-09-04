import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { api, iniciarSesion } from '@/api/cliente';
import * as API from '@/api/endpoints';
import { BotonVolverFlotante } from '@/ui/boton-volver';
import { Disclaimer } from '@/ui/disclaimer';
import { Icono, type NombreIcono } from '@/ui/iconos';
import { useColores } from '@/ui/tema';

const esquema = z.object({
  identificador: z.string().min(3, 'Ingresá tu email.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
});

type Campos = z.infer<typeof esquema>;

export default function Login() {
  const col = useColores();

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

      // Sin suscripción, se ofrece el plan al entrar. Va con `push` sobre
      // Inicio y no en lugar de él: el plan gratis es un plan, no una prueba
      // vencida — el médico tiene que poder cerrarlo y seguir usando la app.
      // Si falla la consulta no se muestra nada: no vale trabar el ingreso por
      // un dato de facturación.
      try {
        const plan = await API.plan();
        if (!plan.vigente) router.push('/paywall');
      } catch {
        /* silencio a propósito */
      }
    } catch (e) {
      setErrorServidor(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    }
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Login no tiene header —el logo centrado es la pantalla entera—, así
          que la salida se dibuja flotando encima. */}
      <BotonVolverFlotante />

      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10">
        <View className="mb-8 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: '#005228' }}>
            <Text className="text-lg font-fuerte tracking-widest text-white">GFH</Text>
          </View>
          <Text className="mt-4 text-grande font-fuerte text-ink">Iniciar sesión</Text>
          <Text className="font-sans mt-1 text-meta text-ink-suave">
            Verificación clínica para tus pacientes.
          </Text>
        </View>

        <View
          className="gap-3 rounded-xl border bg-surface px-5 pb-6 pt-8"
          style={{
            borderColor: col.line,
            borderLeftWidth: 4,
            borderLeftColor: '#22C55E',
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 1,
            shadowOffset: { width: 0, height: 1 },
          }}
        >
          <Campo
            control={control}
            nombre="identificador"
            etiqueta="Email"
            placeholder="tu@email.com"
            error={errors.identificador?.message}
            teclado="email-address"
            icono="correo"
          />
          <Campo
            control={control}
            nombre="password"
            etiqueta="Contraseña"
            placeholder="••••••••"
            error={errors.password?.message}
            secreto
            icono="candado"
          />

          <Pressable
            onPress={() => router.push('/recuperar')}
            accessibilityRole="button"
            className="items-end pb-1"
          >
            <Text className="text-meta font-medio" style={{ color: '#005228' }}>
              ¿Olvidé mi contraseña?
            </Text>
          </Pressable>

          {errorServidor ? (
            <Text className="text-meta" style={{ color: col.peligro }}>
              {errorServidor}
            </Text>
          ) : null}

          <Pressable
            onPress={enviar}
            disabled={isSubmitting}
            className="h-14 flex-row items-center justify-center rounded-full"
            style={{ backgroundColor: '#005228', opacity: isSubmitting ? 0.6 : 1 }}
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-fila font-fuerte text-white">Entrar</Text>
            )}
          </Pressable>
        </View>
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
  icono,
}: {
  control: ReturnType<typeof useForm<Campos>>['control'];
  nombre: keyof Campos;
  etiqueta: string;
  placeholder: string;
  error?: string;
  secreto?: boolean;
  teclado?: 'email-address';
  icono: NombreIcono;
}) {
  const col = useColores();
  const [verPassword, setVerPassword] = useState(false);

  return (
    <View>
      <Text className="mb-1.5 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
        {etiqueta}
      </Text>
      <View className="flex-row items-center">
        <View className="pointer-events-none absolute left-3.5 z-10">
          <Icono nombre={icono} tamano={18} color={col.tenue} />
        </View>
        <Controller
          control={control}
          name={nombre}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              placeholderTextColor={col.tenue}
              secureTextEntry={secreto && !verPassword}
              keyboardType={teclado}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={etiqueta}
              className="h-[52px] flex-1 rounded-lg border border-line bg-surface pl-11 text-body text-ink"
              style={{ paddingRight: secreto ? 44 : 14 }}
            />
          )}
        />
        {secreto ? (
          <Pressable
            onPress={() => setVerPassword((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 h-8 w-8 items-center justify-center"
            hitSlop={6}
          >
            <Icono nombre={verPassword ? 'ojoCerrado' : 'ojo'} tamano={18} color={col.tenue} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="font-sans mt-1 text-meta" style={{ color: col.peligro }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
