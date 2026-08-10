// Con un prisma.config.ts presente, la CLI ya no carga `.env` sola — de ahí el
// import de dotenv. Reemplaza a `package.json#prisma`, deprecado en Prisma 7.
import 'dotenv/config';

import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
