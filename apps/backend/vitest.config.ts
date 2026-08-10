import { defineConfig } from 'vitest/config';

/**
 * Los unitarios (`src/**`) corren siempre: son deterministas y no tocan red.
 * Los de integración (`test/**`) necesitan la base con el catálogo cargado, así
 * que van aparte con `pnpm test:api`.
 *
 * Separarlos no es ceremonia: si `pnpm test` dependiera de Postgres, un
 * problema de red se leería como código roto.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
