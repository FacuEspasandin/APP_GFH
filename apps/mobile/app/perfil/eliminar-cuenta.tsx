import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { cerrarSesionLocal } from '@/api/cliente';
import * as API from '@/api/endpoints';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { AvisoPeligro, Boton, CampoTexto, Pantalla, TextoPeligro } from '@/ui/kit';
import { useColores } from '@/ui/tema';
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
 * **No se puede dar de baja con la suscripción vigente.** El backend lo
 * rechaza y acá se explica antes de que el médico lo intente: nosotros no
 * cobramos ni reembolsamos —eso pasa por Apple y Google— así que una cuenta
 * borrada con una suscripción viva lo dejaría pagando por algo a lo que no
 * puede entrar.
 */
export default function EliminarCuenta() {
  const col = useColores();

  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const eliminar = useMutation({
    mutationFn: () => API.eliminarCuenta(password),
    onSuccess: async () => {
      await cerrarSesionLocal();
      router.replace('/bienvenida');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo procesar.'),
  });

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Eliminar Cuenta" />
      <Pantalla>
        <AvisoPeligro className="mb-5" titulo="Esto es irreversible pasado el período de gracia">
          {/* El número y no «un tiempo»: es lo que decide si el médico se anima. */}
          <TextoPeligro>
            • Tenés {DIAS_DE_GRACIA_BAJA} días para volver atrás: entrá de nuevo con tu email y
            contraseña y la cuenta se reactiva con todo adentro.
          </TextoPeligro>
          <TextoPeligro>
            • Pasados los {DIAS_DE_GRACIA_BAJA} días se borra todo de forma definitiva — pacientes,
            tratamientos e historial.
          </TextoPeligro>
          <TextoPeligro>
            • Con una suscripción activa no se puede eliminar: cancelala primero en App Store o
            Google Play. Desde acá no podemos cancelarla ni devolver lo pagado.
          </TextoPeligro>
        </AvisoPeligro>

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
          onPress={() =>
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
                  eliminar.mutate();
                },
              },
              ],
            )
          }
        >
          Eliminar mi cuenta
        </Boton>
      </Pantalla>
    </View>
  );
}
