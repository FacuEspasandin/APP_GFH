-- Login con Google: la contraseña deja de ser obligatoria (una cuenta puede
-- ser sólo de Google) y se agrega el id de Google para resolver la cuenta.

ALTER TABLE "medico" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "medico" ADD COLUMN "googleId" TEXT;

CREATE UNIQUE INDEX "medico_googleId_key" ON "medico"("googleId");
