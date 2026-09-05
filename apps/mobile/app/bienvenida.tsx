import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Bienvenida (1.2). Logo, las dos entradas, y los legales al pie. */
export default function Bienvenida() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 px-6 pb-6"
      style={{ backgroundColor: '#006D37', paddingTop: insets.top + 24 }}
    >
      <View className="flex-1 items-center justify-center">
        <View className="h-24 w-24 items-center justify-center rounded-2xl bg-white">
          <Text className="text-2xl font-fuerte" style={{ color: '#005228' }}>
            GFH
          </Text>
        </View>
        <Text className="mt-8 text-center text-grande font-fuerte text-white">
          ¿Es seguro este fármaco para este paciente, hoy?
        </Text>
        <Text className="font-sans mt-4 text-center text-body leading-6 text-white/80">
          Interacciones, ajuste renal y alertas por condición o alergia, calculados sobre lo que
          cargaste.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/login')}
        accessibilityRole="button"
        className="h-14 items-center justify-center rounded-full bg-white"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      >
        <Text
          className="font-fuerte text-eyebrow uppercase tracking-wider"
          style={{ color: '#005228' }}
        >
          Iniciar sesión
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/registro')}
        accessibilityRole="button"
        className="mt-2 h-14 items-center justify-center rounded-full border border-white"
      >
        <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-white">
          Registrarme
        </Text>
      </Pressable>

      <Text className="font-sans mt-4 text-center text-eyebrow leading-4 text-white/60">
        Herramienta de apoyo a la decisión clínica. No sustituye el juicio del médico tratante.
      </Text>
    </View>
  );
}
