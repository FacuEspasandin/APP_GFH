-- De donde salio la tabla de ajuste renal de un farmaco.
--
-- Hasta hoy todas las filas venian de las tablas SEN, con sus tres bandas
-- fijas iguales para todos los farmacos (100-50 / 50-10 / <10). Las
-- monografias del proveedor traen umbrales POR FARMACO — mas precisos, pero
-- solo en alrededor de un tercio de los casos: en el resto la ficha dice
-- "ajustar dosis" sin numero, y de ahi no sale una fila. Por eso conviven, y
-- por eso hay que poder distinguirlas: decide cual gana cuando hay dos, y es
-- lo primero que mira el farmaceutico antes de aprobar.
--
-- Se llama `fuenteDato` y no `fuente` porque `fuente` ya existe en
-- `alerta_condicion_farmaco` con otro significado (texto libre).
CREATE TYPE "FuenteAjuste" AS ENUM ('SEN', 'MONOGRAFIA', 'MANUAL');

ALTER TABLE "ajuste_renal_farmaco"
  ADD COLUMN "fuenteDato" "FuenteAjuste" NOT NULL DEFAULT 'SEN';

CREATE INDEX "ajuste_renal_farmaco_fuenteDato_idx" ON "ajuste_renal_farmaco"("fuenteDato");
