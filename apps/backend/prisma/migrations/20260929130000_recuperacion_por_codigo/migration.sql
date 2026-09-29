-- La recuperación pasa de enlace con token a código de 6 dígitos que se escribe
-- en la app. La tabla tiene minutos de vida y ningún dato que importe, así que
-- se reemplaza en vez de migrarla columna por columna.

-- DropTable
DROP TABLE "token_recuperacion";

-- CreateTable
CREATE TABLE "codigo_recuperacion" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraAt" TIMESTAMP(3) NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "usadaAt" TIMESTAMP(3),

    CONSTRAINT "codigo_recuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "codigo_recuperacion_medicoId_creadoAt_idx" ON "codigo_recuperacion"("medicoId", "creadoAt");

-- CreateIndex
CREATE INDEX "codigo_recuperacion_expiraAt_idx" ON "codigo_recuperacion"("expiraAt");

-- AddForeignKey
ALTER TABLE "codigo_recuperacion" ADD CONSTRAINT "codigo_recuperacion_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
