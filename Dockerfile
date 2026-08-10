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

FROM node:20-alpine

# OpenSSL: Prisma lo necesita para el motor de consultas en Alpine.
RUN apk add --no-cache openssl

ENV NODE_ENV=production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Primero sólo los manifiestos: si no cambian, Docker reusa la capa de
# dependencias y el build tarda segundos en vez de minutos.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/tsconfig/package.json packages/tsconfig/

# Con todas las dependencias, no sólo las de producción: `prisma` (el CLI) vive
# en devDependencies y hace falta para generar el cliente y migrar.
RUN pnpm install --frozen-lockfile --filter @gfh/backend...

COPY packages/ packages/
COPY apps/backend/ apps/backend/

RUN pnpm --filter @gfh/backend prisma:generate

# PORT no se fija acá a propósito: lo inyecta el host (Render usa 10000) y una
# ENV en la imagen sería una segunda fuente de verdad para el mismo dato.
# EXPOSE es sólo documentación del puerto local.
EXPOSE 3333

# Las migraciones se aplican al arrancar. `migrate deploy` no pide confirmación
# y no borra nada: sólo aplica lo que falte.
CMD ["sh", "-c", "pnpm --filter @gfh/backend deploy:migrar && pnpm --filter @gfh/backend start:prod"]
