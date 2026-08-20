-- Datos comerciales que llegan de un catálogo externo.
--
-- Escrita a mano y aplicada con `migrate deploy`. `migrate dev` no se usa en
-- este proyecto: los índices trigram de `20260814190000_busqueda_trigram` se
-- crearon con SQL crudo y `dev` los lee como deriva del esquema, así que exige
-- resetear la base entera. Con 638 productos y 507 alertas cargadas, eso no
-- pasa.
--
-- Las cuatro columnas son aditivas y con valor por defecto, así que lo que ya
-- está cargado sigue funcionando sin tocarlo.

CREATE TYPE "CondicionVenta" AS ENUM ('VENTA_LIBRE', 'RECETA', 'RECETA_CONTROLADA', 'DESCONOCIDA');

ALTER TABLE "producto_comercial"
  -- El envase, aparte de la concentración: «caja x 20» no es «500 mg».
  ADD COLUMN "presentacion" TEXT,

  -- DESCONOCIDA y no VENTA_LIBRE: es un dato regulatorio y suponerlo es
  -- inventarlo.
  ADD COLUMN "condicionVenta" "CondicionVenta" NOT NULL DEFAULT 'DESCONOCIDA',

  -- Lo ya cargado se asume vigente; el importador lo baja cuando el proveedor
  -- declara que el producto salió del mercado.
  ADD COLUMN "vigente" BOOLEAN NOT NULL DEFAULT true,

  -- Procedencia. Nulo = cargado a mano o por el seed.
  ADD COLUMN "importadoAt" TIMESTAMP(3),
  ADD COLUMN "origenDato" TEXT;

-- El buscador va a tener que excluir lo discontinuado, y son 638 filas que
-- crecen a varios miles con el catálogo real.
CREATE INDEX "producto_comercial_vigente_idx" ON "producto_comercial" ("vigente");
