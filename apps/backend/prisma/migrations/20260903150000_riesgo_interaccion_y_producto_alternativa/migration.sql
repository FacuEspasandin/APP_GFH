-- Dos cambios independientes que viajan juntos porque nacen de la misma
-- ronda de trabajo (buscador con filtros, alternativas por fármaco con
-- selección de producto comercial, cockpit agrupado por tipo de riesgo):
--
-- 1. `tipoRiesgo` en interaccion_detectada: el mecanismo clínico de la
--    interacción (sangrado, QT prolongado, etc.), para agrupar hallazgos
--    relacionados en el cockpit en vez de listarlos sueltos. No participa del
--    cálculo de severidad — eso lo sigue haciendo `severidad`. Nullable: las
--    filas existentes no lo tienen, se completa solo al recalcular.
--
-- 2. `productoComercialId` en alternativa_aceptada: qué presentación
--    comercial concreta eligió el médico al aceptar una alternativa, en vez
--    de que el backend resolviera el genérico en silencio. Nullable por lo
--    mismo, más el caso de alternativa documentada sin reemplazo.
CREATE TYPE "TipoRiesgoInteraccion" AS ENUM (
  'SANGRADO',
  'MIOPATIA_RABDOMIOLISIS',
  'MIELOSUPRESION',
  'SINDROME_SEROTONINERGICO',
  'HIPERPOTASEMIA',
  'NEFROTOXICIDAD',
  'TOXICIDAD_DIGITALICA',
  'TOXICIDAD_LITIO',
  'HIPOGLUCEMIA',
  'EFICACIA_REDUCIDA',
  'QT_PROLONGADO',
  'ABSORCION_REDUCIDA'
);

ALTER TABLE "interaccion_detectada" ADD COLUMN "tipoRiesgo" "TipoRiesgoInteraccion";

ALTER TABLE "alternativa_aceptada" ADD COLUMN "productoComercialId" TEXT;

ALTER TABLE "alternativa_aceptada"
  ADD CONSTRAINT "alternativa_aceptada_productoComercialId_fkey"
  FOREIGN KEY ("productoComercialId") REFERENCES "producto_comercial"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
