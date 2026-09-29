-- CreateTable
CREATE TABLE "token_recuperacion" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraAt" TIMESTAMP(3) NOT NULL,
    "usadaAt" TIMESTAMP(3),

    CONSTRAINT "token_recuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_recuperacion_tokenHash_key" ON "token_recuperacion"("tokenHash");

-- CreateIndex
CREATE INDEX "token_recuperacion_medicoId_idx" ON "token_recuperacion"("medicoId");

-- CreateIndex
CREATE INDEX "token_recuperacion_expiraAt_idx" ON "token_recuperacion"("expiraAt");

-- AddForeignKey
ALTER TABLE "token_recuperacion" ADD CONSTRAINT "token_recuperacion_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
