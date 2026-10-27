import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { estiloSombra } from '@/ui/superficie';
import { FIJO } from '@/ui/tokens';

/** Bienvenida (1.2). Logo, las dos entradas, y los legales al pie. */
export default function Bienvenida() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 px-6 pb-6"
      style={{ backgroundColor: FIJO.verdeBarra, paddingTop: insets.top + 24 }}
    >
      <View className="flex-1 items-center justify-center">
        <View className="h-24 w-24 items-center justify-center rounded-2xl bg-blanco">
          <Text className="text-2xl font-fuerte" style={{ color: FIJO.marca }}>
            GFH
          </Text>
        </View>
        <Text className="mt-8 text-center text-grande font-fuerte text-blanco">
          ¿Es seguro este fármaco para este paciente, hoy?
        </Text>
        <Text className="font-sans mt-4 text-center text-body leading-6 text-blanco/80">
          Interacciones, ajuste renal y alertas por condición o alergia, calculados sobre lo que
          cargaste.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/login')}
        accessibilityRole="button"
        className="h-14 items-center justify-center rounded-full bg-blanco"
        style={estiloSombra('media')}
      >
        <Text
          className="font-fuerte text-eyebrow uppercase tracking-wider"
          style={{ color: FIJO.marca }}
        >
          Iniciar sesión
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/registro')}
        accessibilityRole="button"
        className="mt-2 h-14 items-center justify-center rounded-full border border-blanco"
      >
        <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-blanco">
          Registrarme
        </Text>
      </Pressable>

      <Text className="font-sans mt-4 text-center text-eyebrow leading-4 text-blanco/60">
        Herramienta de apoyo a la decisión clínica. No sustituye el juicio del médico tratante.
      </Text>
    </View>
  );
}
