import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { cerrarSesionLocal } from '@/api/cliente';
import { AvisoNeutro, Boton } from '@/ui/kit';

/**
 * Suscripción vencida (1.9) — bloqueo de acceso.
 *
 * PUNTO ABIERTO del documento funcional §9.3: el wireframe asume bloqueo total,
 * pero nunca se confirmó contra un modo de solo lectura. Se implementa el
 * bloqueo por ser lo que está diseñado, y queda anotado acá para que la
 * decisión no se pierda dentro del código.
 */
export default function SuscripcionVencida() {
  const router = useRouter();

  return (
    <View className="flex-1 justify-center bg-paper px-6 pb-10">
      <View className="items-center">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-light">
          <Text className="text-xl font-fuerte text-primary">!</Text>
        </View>
        <Text className="mt-5 text-center text-grande font-fuerte text-ink">
          Tu suscripción venció
        </Text>
        <Text className="font-sans mt-2 text-center text-body leading-6 text-ink-suave">
          Renovala desde la tienda para volver a acceder a tus pacientes. Los datos siguen
          guardados.
        </Text>
      </View>

      <View className="mt-8">
        <Boton onPress={() => router.push('/paywall')}>Ver planes</Boton>
        <View className="mt-3">
          <Boton
            variante="secundario"
            onPress={async () => {
              await cerrarSesionLocal();
              router.replace('/bienvenida');
            }}
          >
            Cerrar sesión
          </Boton>
        </View>
      </View>

      <View className="mt-6">
        <AvisoNeutro>
          El estado de la suscripción lo define la tienda, no la app. Si ya renovaste y sigue
          bloqueado, puede tardar unos minutos en sincronizar.
        </AvisoNeutro>
      </View>
    </View>
  );
}
