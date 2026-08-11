-- CreateEnum
CREATE TYPE "TipoEventoPaciente" AS ENUM ('PACIENTE_CREADO', 'PACIENTE_EDITADO', 'FARMACO_AGREGADO', 'FARMACO_EDITADO', 'FARMACO_SUSPENDIDO', 'FARMACO_REACTIVADO', 'FARMACO_QUITADO', 'CONDICION_AGREGADA', 'CONDICION_QUITADA', 'ALERGIA_AGREGADA', 'ALERGIA_QUITADA', 'DATOS_RENALES', 'DATOS_HEPATICOS', 'EMBARAZO_LACTANCIA', 'ALTERNATIVA_ACEPTADA');

-- CreateTable
CREATE TABLE "evento_paciente" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" "TipoEventoPaciente" NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "cambios" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_paciente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evento_paciente_medicoId_pacienteId_createdAt_idx" ON "evento_paciente"("medicoId", "pacienteId", "createdAt");

-- AddForeignKey
ALTER TABLE "evento_paciente" ADD CONSTRAINT "evento_paciente_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_paciente" ADD CONSTRAINT "evento_paciente_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
