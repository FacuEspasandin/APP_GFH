-- Notificaciones push: registro de tokens, control de trial/período, y
-- deduplicación de los avisos que dispara el escaneo periódico.
--
-- Escrita a mano y aplicada con `prisma migrate deploy` (no `migrate dev`):
-- hay una migración anterior (`20260829120000_baja_con_gracia`) modificada
-- después de aplicada, y `migrate dev` propone resetear el esquema entero
-- por ese drift. `migrate deploy` sólo aplica lo pendiente, sin diff contra
-- una shadow DB.

CREATE TYPE "PlataformaPush" AS ENUM ('IOS', 'ANDROID');

CREATE TYPE "TipoNotificacionPush" AS ENUM (
    'ACTIVACION_D1',
    'TRIAL_2_DIAS',
    'TRIAL_ULTIMO_DIA',
    'TRIAL_VENCIDO_WINBACK',
    'CANCELACION_WINBACK',
    'CUPO_8_DE_10',
    'CUPO_AGOTADO',
    'INACTIVO_7D',
    'INACTIVO_30D',
    'CUENTA_GRACIA_AVISO'
);

ALTER TABLE "medico" ADD COLUMN "ultimoLoginAt" TIMESTAMP(3);

ALTER TABLE "suscripcion" ADD COLUMN "periodoEsTrial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "suscripcion" ADD COLUMN "tuvoTrial" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "push_token" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "plataforma" "PlataformaPush" NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_token_token_key" ON "push_token"("token");
CREATE INDEX "push_token_medicoId_idx" ON "push_token"("medicoId");

ALTER TABLE "push_token"
    ADD CONSTRAINT "push_token_medicoId_fkey"
    FOREIGN KEY ("medicoId") REFERENCES "medico"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notificacion_enviada" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "tipo" "TipoNotificacionPush" NOT NULL,
    "enviadaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_enviada_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notificacion_enviada_medicoId_tipo_key" ON "notificacion_enviada"("medicoId", "tipo");

ALTER TABLE "notificacion_enviada"
    ADD CONSTRAINT "notificacion_enviada_medicoId_fkey"
    FOREIGN KEY ("medicoId") REFERENCES "medico"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
