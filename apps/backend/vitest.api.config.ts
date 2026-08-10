import { defineConfig } from 'vitest/config';

/**
 * Tests de integración: app real, base real.
 *
 * En serie y con un solo hilo a propósito. Comparten la base, y aunque cada
 * corrida se aísla con su propio médico, ejecutarlos en paralelo multiplica las
 * conexiones contra el pooler de Supabase sin ganar nada: son pocos y lo que
 * tardan es la red.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.e2e.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 90_000,
  },
});
