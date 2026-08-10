import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { api, cerrarSesionLocal } from '@/api/cliente';
import { AvisoNeutro, Boton, CampoTexto, Pantalla } from '@/ui/kit';

/**
 * Eliminar cuenta (6.14).
 *
 * Baja diferida: la cuenta queda inhabilitada y se cierran las sesiones. El
 * borrado físico espera al período de gracia, que todavía no está definido
 * (funcional §9.4). Marcar es reversible; borrar no, y no se toma esa decisión
 * por defecto.
 */
export default function EliminarCuenta() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const eliminar = useMutation({
    mutationFn: () => api.post('/perfil/eliminar-cuenta', { password }),
    onSuccess: async () => {
      await cerrarSesionLocal();
      router.replace('/bienvenida');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo procesar.'),
  });

  return (
    <Pantalla>
      <Text className="font-sans text-body leading-6 text-ink">
        Se inhabilita tu cuenta y se cierran todas las sesiones. Tus pacientes dejan de estar
        accesibles.
      </Text>

      <Text className="font-sans mt-3 text-body leading-6 text-ink">
        La suscripción se cancela desde la tienda: borrar la cuenta acá no detiene un cobro
        recurrente.
      </Text>

      <AvisoNeutro>
        El borrado definitivo de los datos espera un período de gracia que todavía no está definido.
      </AvisoNeutro>

      <CampoTexto
        etiqueta="Confirmá con tu contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? (
        <Text className="font-sans mb-3 text-meta" style={{ color: '#991B1B' }}>
          {error}
        </Text>
      ) : null}

      <Boton
        variante="destructivo"
        cargando={eliminar.isPending}
        deshabilitado={password.length === 0}
        onPress={() =>
          Alert.alert('Eliminar cuenta', 'No vas a poder volver a entrar.', [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: () => {
                setError(null);
                eliminar.mutate();
              },
            },
          ])
        }
      >
        Eliminar mi cuenta
      </Boton>
    </Pantalla>
  );
}
