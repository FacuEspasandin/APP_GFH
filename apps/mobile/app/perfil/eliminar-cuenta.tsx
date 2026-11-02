import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { cerrarSesionLocal } from '@/api/cliente';
import * as API from '@/api/endpoints';
import { pedirTokenDeGoogle } from '@/api/google-signin';
import { presentarCentroDeCliente } from '@/api/revenuecat';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { AvisoNeutro, AvisoPeligro, Boton, CampoTexto, Pantalla, TextoPeligro } from '@/ui/kit';
import { useColores } from '@/ui/tema';
import { nombreDeLaTienda } from '@/ui/tienda';
import { DIAS_DE_GRACIA_BAJA } from '@gfh/shared-types';

/**
 * Eliminar cuenta (6.14).
 *
 * Baja con período de gracia: la cuenta queda inhabilitada, se cierran las
 * sesiones y el médico tiene siete días para arrepentirse. Recuperarla es
 * volver a entrar — no hay un flujo aparte, porque el gesto de arrepentirse ya
 * es exactamente ése.
 *
 * Pasados los siete días se purga de verdad, y eso sí no tiene vuelta. La
 * pantalla lo dice con el número, no con «un tiempo».
 *
 * **Con una suscripción vigente también se puede.** Antes se bloqueaba y había
 * que cancelar primero en la tienda; Apple lo lee como «no se puede eliminar la
 * cuenta» (guideline 5.1.1(v)). Ahora se elimina, y la pantalla avisa que el
 * cobro sigue hasta cancelar y lleva directo a gestionarla: nosotros no cobramos
 * ni reembolsamos, eso pasa por la tienda.
 *
 * **Cómo se confirma depende de cómo entra la cuenta:** con contraseña, la
 * contraseña; si entra sólo por Google, volver a elegir la cuenta de Google. Antes
 * una cuenta de Google confirmaba con cualquier texto en un campo de contraseña
 * que nunca había tenido.
 */
export default function EliminarCuenta() {
  const col = useColores();
  const router = useRouter();
  const tienda = nombreDeLaTienda();

  const { data: perfil } = useQuery({ queryKey: ['perfil'], queryFn: API.yo });
  const { data: suscripcion } = useQuery({ queryKey: ['suscripcion'], queryFn: API.estadoSuscripcion });

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Hasta saber cómo entra la cuenta no se muestra ningún método: pedir la
  // contraseña a una cuenta de Google es lo que se está corrigiendo.
  const conPassword = perfil?.tienePassword === true;
  const soloGoogle = perfil !== undefined && !perfil.tienePassword && perfil.tieneGoogle === true;

  const eliminar = useMutation({
    mutationFn: (prueba: { password?: string; googleIdToken?: string }) => API.eliminarCuenta(prueba),
    onSuccess: async () => {
      await cerrarSesionLocal();
      router.replace('/bienvenida');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo procesar.'),
  });

  const confirmar = (prueba: () => Promise<{ password?: string; googleIdToken?: string } | null>) =>
    Alert.alert(
      'Eliminar cuenta',
      `Tenés ${DIAS_DE_GRACIA_BAJA} días para recuperarla entrando de nuevo. Después se borra todo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setError(null);
            void prueba()
              .then((p) => {
                if (p) eliminar.mutate(p);
              })
              .catch((e: unknown) =>
                setError(e instanceof Error ? e.message : 'No se pudo confirmar con Google.'),
              );
          },
        },
      ],
    );

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Eliminar Cuenta" />
      <Pantalla>
        <AvisoPeligro className="mb-5" titulo="Esto es irreversible pasado el período de gracia">
          {/* El número y no «un tiempo»: es lo que decide si el médico se anima. */}
          <TextoPeligro>
            • Tenés {DIAS_DE_GRACIA_BAJA} días para volver atrás: entrá de nuevo y la cuenta se
            reactiva con todo adentro.
          </TextoPeligro>
          <TextoPeligro>
            • Pasados los {DIAS_DE_GRACIA_BAJA} días se borra todo de forma definitiva — pacientes,
            tratamientos, conversaciones con Vera e historial.
          </TextoPeligro>
        </AvisoPeligro>

        {/* La suscripción no se cancela sola al borrar la cuenta. Se dice ANTES de
            confirmar, con el atajo para cancelarla. */}
        {suscripcion?.vigente ? (
          <View className="mb-5">
            <AvisoNeutro>
              Tu suscripción sigue activa y se va a seguir cobrando hasta que la canceles en
              {` ${tienda}`}. Eliminar la cuenta no la cancela, y desde GFH no podemos cancelarla ni
              devolver lo pagado.
            </AvisoNeutro>
            <Boton variante="secundario" onPress={() => void presentarCentroDeCliente()}>
              Gestionar suscripción
            </Boton>
          </View>
        ) : null}

        {conPassword ? (
          <>
            <CampoTexto
              etiqueta="Confirmá con tu contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {error ? (
              <Text className="font-sans mb-3 text-meta" style={{ color: col.peligro }}>
                {error}
              </Text>
            ) : null}
            <Boton
              variante="destructivo"
              cargando={eliminar.isPending}
              deshabilitado={password.length === 0}
              onPress={() => confirmar(async () => ({ password }))}
            >
              Eliminar mi cuenta
            </Boton>
          </>
        ) : soloGoogle ? (
          <>
            <Text className="font-sans mb-3 text-meta leading-5 text-ink-suave">
              Tu cuenta entra con Google. Para confirmar que sos vos, volvé a elegir tu cuenta de
              Google.
            </Text>
            {error ? (
              <Text className="font-sans mb-3 text-meta" style={{ color: col.peligro }}>
                {error}
              </Text>
            ) : null}
            <Boton
              variante="destructivo"
              cargando={eliminar.isPending}
              onPress={() =>
                confirmar(async () => {
                  const token = await pedirTokenDeGoogle();
                  return token ? { googleIdToken: token } : null;
                })
              }
            >
              Confirmar con Google y eliminar
            </Boton>
          </>
        ) : (
          <Text className="font-sans text-meta text-ink-suave">Cargando…</Text>
        )}
      </Pantalla>
    </View>
  );
}
