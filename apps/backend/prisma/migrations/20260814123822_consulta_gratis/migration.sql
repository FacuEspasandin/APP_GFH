-- CreateEnum
CREATE TYPE "HerramientaFicha" AS ENUM ('INTERACCIONES', 'RENAL', 'HEPATICO', 'EMBARAZO', 'LACTANCIA');

-- CreateTable
CREATE TABLE "consulta_gratis" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "productoComercialId" TEXT NOT NULL,
    "herramienta" "HerramientaFicha" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consulta_gratis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consulta_gratis_medicoId_idx" ON "consulta_gratis"("medicoId");

-- CreateIndex
CREATE UNIQUE INDEX "consulta_gratis_medicoId_productoComercialId_herramienta_key" ON "consulta_gratis"("medicoId", "productoComercialId", "herramienta");

-- AddForeignKey
ALTER TABLE "consulta_gratis" ADD CONSTRAINT "consulta_gratis_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
