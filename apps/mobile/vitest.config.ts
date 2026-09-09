import path from 'node:path';
import { defineConfig } from 'vitest/config';

const aqui = (ruta: string) => path.resolve(__dirname, ruta);

/**
 * Los tests corren en Node, no en el bundler de Expo, así que hay que decirle
 * dónde están dos cosas: el alias `@` que resuelve Babel en la app, y los
 * paquetes nativos que no existen fuera del teléfono.
 *
 * Los stubs son deliberadamente mínimos: no simulan React Native, sólo dejan
 * importar los módulos de datos para probar SU lógica.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': aqui('src'),
      'react-native': aqui('test/stub-react-native.ts'),
      'expo-secure-store': aqui('test/stub-secure-store.ts'),
      'expo-device': aqui('test/stub-expo-device.ts'),
      'expo-application': aqui('test/stub-expo-application.ts'),
      '@react-native-async-storage/async-storage': aqui('test/stub-async-storage.ts'),
      'react-native-purchases-ui': aqui('test/stub-revenuecat-ui.ts'),
      'react-native-purchases': aqui('test/stub-revenuecat.ts'),
      'expo-notifications': aqui('test/stub-expo-notifications.ts'),
      'expo-constants': aqui('test/stub-expo-constants.ts'),
      '@react-native-google-signin/google-signin': aqui('test/stub-google-signin.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
