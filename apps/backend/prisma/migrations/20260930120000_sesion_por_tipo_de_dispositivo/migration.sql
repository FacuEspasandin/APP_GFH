-- Una sesión viva por tipo de dispositivo (teléfono / tablet) y por cuenta, y el
-- motivo por el que se cierra cada sesión. Sólo agrega: las filas existentes
-- quedan como TELEFONO y sin motivo (se tratan como ROTADA).

-- CreateEnum
CREATE TYPE "TipoDispositivo" AS ENUM ('TELEFONO', 'TABLET');

-- CreateEnum
CREATE TYPE "MotivoRevocacion" AS ENUM ('ROTADA', 'CERRADA', 'REEMPLAZADA');

-- AlterTable
ALTER TABLE "sesion" ADD COLUMN     "motivoRevocacion" "MotivoRevocacion",
ADD COLUMN     "tipoDispositivo" "TipoDispositivo" NOT NULL DEFAULT 'TELEFONO';
