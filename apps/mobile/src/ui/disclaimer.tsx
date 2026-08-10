import { Text, View } from 'react-native';

/**
 * Pie permanente. Regla de negocio no negociable 7: el disclaimer va en cuatro
 * lugares, y este es el primero — visible siempre, no detrás de un toque.
 */
export function Disclaimer() {
  return (
    <View className="border-t border-line bg-surface px-4 py-2.5">
      <Text className="font-sans text-center text-eyebrow leading-4 text-ink-suave">
        Herramienta de apoyo a la decisión clínica. No sustituye el juicio del médico tratante.
      </Text>
    </View>
  );
}
