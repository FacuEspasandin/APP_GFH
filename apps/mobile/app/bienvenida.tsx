import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

/** Bienvenida (1.2). Logo, las dos entradas, y los legales al pie. */
export default function Bienvenida() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-primary px-6 pb-10 pt-24">
      <View className="flex-1 items-center justify-center">
        <View className="h-24 w-24 items-center justify-center rounded-card bg-white/10">
          <Text className="text-2xl font-fuerte tracking-widest text-white">GFH</Text>
        </View>
        <Text className="mt-6 text-center text-grande font-fuerte text-white">
          ¿Es seguro este fármaco para este paciente, hoy?
        </Text>
        <Text className="font-sans mt-3 text-center text-body leading-6 text-white/70">
          Interacciones, ajuste renal y alertas por condición o alergia, calculados sobre lo que
          cargaste.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/login')}
        accessibilityRole="button"
        className="h-12 items-center justify-center rounded-chip bg-white"
      >
        <Text className="text-body font-fuerte text-primary">Iniciar sesión</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/registro')}
        accessibilityRole="button"
        className="mt-3 h-12 items-center justify-center rounded-chip border border-white/40"
      >
        <Text className="text-body font-fuerte text-white">Registrarme</Text>
      </Pressable>

      <Text className="font-sans mt-6 text-center text-eyebrow leading-4 text-white/60">
        Herramienta de apoyo a la decisión clínica. No sustituye el juicio del médico tratante.
      </Text>
    </View>
  );
}
