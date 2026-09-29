# Backend de GFH Móvil.
#
# Se construye desde la RAÍZ del monorepo, no desde apps/backend: el backend
# importa `@gfh/shared-types` por workspace, y ese paquete publica TypeScript
# crudo. Copiar sólo apps/backend deja la importación colgada.
#
#   docker build -t gfh-backend .
#   docker run -p 3333:3333 --env-file apps/backend/.env gfh-backend
#
# La app corre con `tsx` en vez de compilar a JS. Es deliberado: compilar con
# `tsc` obligaría a que shared-types publique su propio build, y este código ya
# no depende de la metadata de decoradores que tsx no emite — la inyección usa
# `@Inject()` y los cuerpos `@Cuerpo(Dto)`, ambos explícitos.

# Node 22 (LTS vigente): la 20 llegó a fin de vida. Una sola etapa a propósito: en
# runtime hacen falta `tsx` y el CLI de `prisma`, que son devDependencies, así que
# una etapa final sin ellas no podría ni arrancar ni migrar y sólo sumaría capas.
FROM node:22-alpine

# OpenSSL: Prisma lo necesita para el motor de consultas en Alpine.
RUN apk add --no-cache openssl

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Primero sólo los manifiestos: si no cambian, Docker reusa la capa de
# dependencias y el build tarda segundos en vez de minutos.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/motor-clinico/package.json packages/motor-clinico/
# El manifiesto del mobile, aunque su código no se copie: `pnpm-workspace.yaml`
# declara `apps/*` y el lockfile tiene los cinco proyectos. Si falta uno,
# `--frozen-lockfile` corta porque el workspace no coincide con el lockfile.
COPY apps/mobile/package.json apps/mobile/

# `--prod=false` explícito: `prisma` (el CLI) vive en devDependencies y hace
# falta para generar el cliente y migrar. NODE_ENV se pone DESPUÉS del install
# a propósito — si estuviera puesto acá, pnpm saltearía las devDependencies y
# `prisma generate` fallaría con "command not found".
RUN pnpm install --frozen-lockfile --prod=false --filter @gfh/backend...

COPY packages/ packages/
COPY apps/backend/ apps/backend/
# Dato de runtime, no documentación: el módulo de interacciones lo lee al
# arrancar. La ruta debe quedar en /app/docs/data — es la que resuelve
# `RUTA_REGLAS_POR_DEFECTO` subiendo cinco niveles desde el loader.
COPY docs/data/reglas-interaccion.json docs/data/
COPY docs/data/ayuda-faq.json docs/data/
COPY docs/data/ayuda-problemas.json docs/data/

RUN pnpm --filter @gfh/backend prisma:generate

ENV NODE_ENV=production

# No corre como root: un fallo en la app no puede escribir fuera de lo suyo. Todo
# lo que hace falta en runtime (node_modules, el cliente de Prisma ya generado, el
# código) se escribió arriba y se lee sin permisos especiales.
USER node

# PORT no se fija acá a propósito: lo inyecta el host (Render usa 10000) y una
# ENV en la imagen sería una segunda fuente de verdad para el mismo dato.
# EXPOSE es sólo documentación del puerto local.
EXPOSE 3333

# Las migraciones se aplican al arrancar. `migrate deploy` no pide confirmación
# y no borra nada: sólo aplica lo que falte.
# Sin pnpm en runtime: corepack quiere escribir su caché en el HOME del usuario y
# un usuario sin privilegios no debería depender de eso al arrancar. Son los
# mismos comandos que `deploy:migrar` y `start:prod`, llamados directo. `exec` deja
# a node como proceso principal para que reciba SIGTERM.
WORKDIR /app/apps/backend
CMD ["sh", "-c", "node ../../node_modules/prisma/build/index.js migrate deploy && exec node --import tsx src/main.ts"]
