-- Email verificado y bloqueo de login por cuenta. Sólo agrega columnas.

-- AlterTable
ALTER TABLE "medico" ADD COLUMN     "emailVerificadoAt" TIMESTAMP(3),
ADD COLUMN     "intentosLoginFallidos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ventanaLoginDesde" TIMESTAMP(3),
ADD COLUMN     "bloqueadoHasta" TIMESTAMP(3);

-- Una cuenta vinculada a Google ya tiene el email verificado por Google.
-- Las de contraseña quedan sin verificar: hasta que exista el envío de códigos
-- (necesita el dominio de Resend) nada las marca como verificadas salvo
-- recuperar la contraseña, que prueba el control del buzón.
UPDATE "medico" SET "emailVerificadoAt" = "createdAt" WHERE "googleId" IS NOT NULL;
