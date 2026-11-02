-- Consentimientos del médico: términos y privacidad, Vera (IA de un tercero) y
-- carga por foto (OCR de un tercero). Cada uno con la versión del texto aceptado
-- y la fecha. Sólo agrega columnas nulas: ninguna fila existente cambia, y el
-- RLS de la tabla ya está activo desde 20260930160000.

-- AlterTable
ALTER TABLE "medico" ADD COLUMN     "terminosVersion" TEXT,
ADD COLUMN     "terminosAceptadosAt" TIMESTAMP(3),
ADD COLUMN     "consentimientoVeraVersion" TEXT,
ADD COLUMN     "consentimientoVeraAt" TIMESTAMP(3),
ADD COLUMN     "consentimientoFotoVersion" TEXT,
ADD COLUMN     "consentimientoFotoAt" TIMESTAMP(3);
