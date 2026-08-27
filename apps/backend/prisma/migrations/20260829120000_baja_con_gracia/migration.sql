-- Cuándo se pidió la baja de la cuenta.
--
-- El estado ELIMINADO ya existía, pero sin fecha: nada podía saber si la baja
-- fue hace dos días o hace dos años, así que los siete días de gracia no se
-- podían contar y la purga no tenía contra qué medir.
--
-- Nullable a propósito. Las cuentas que ya estaban en ELIMINADO antes de esta
-- migración no tienen fecha y no se puede inventar: se las trata como fuera
-- del período de gracia, que es lo conservador —no se reactivan solas— y a la
-- vez no se purgan sin que alguien decida, porque purgar sin fecha sería
-- borrar historia clínica adivinando cuándo se pidió.
ALTER TABLE "medico" ADD COLUMN "eliminadaAt" TIMESTAMP(3);

-- Para la purga: barre las vencidas sin recorrer la tabla entera.
CREATE INDEX "medico_eliminadaAt_idx" ON "medico"("eliminadaAt");
