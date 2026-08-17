-- Child-Pugh pasa a responderse por banda y no por valor de laboratorio.
--
-- La escala no distingue una bilirrubina de 2,4 de una de 2,9: las dos son
-- «2 – 3», dos puntos. Pedir el número exacto para después clasificarlo era
-- pedir un dato más fino del que el cálculo usa, y obligaba a escribir donde
-- alcanza con tocar.
--
-- El valor exacto NO se va: queda como dato opcional, porque el historial dice
-- «Bilirrubina: 2,4 → 3,1 mg/dL» y esa evolución vale. Lo que cambia es quién
-- decide el puntaje — ahora la banda, antes el número.
--
-- Escrita a mano y aplicada con `migrate deploy` a propósito. `migrate dev`
-- compara contra una base sombra y en este proyecto propuso RESETEAR el
-- esquema: los índices trigram se crearon con SQL suelto y Prisma no los
-- reconoce como suyos. Sólo agrega columnas, no toca ni una fila existente.
ALTER TABLE "paciente" ADD COLUMN "bilirrubinaPuntos" INTEGER;
ALTER TABLE "paciente" ADD COLUMN "albuminaPuntos" INTEGER;
ALTER TABLE "paciente" ADD COLUMN "inrPuntos" INTEGER;

-- Los pacientes que ya tenían valores cargados conservan su clase: se les
-- deriva la banda del número que tienen, con los mismos cortes que usa
-- `puntosBilirrubina` y compañía. Sin esto, abrir un paciente viejo mostraría
-- las cinco bandas apagadas y su Child-Pugh guardado sin explicación.
UPDATE "paciente" SET "bilirrubinaPuntos" =
  CASE WHEN "bilirrubinaMgDl" <  2   THEN 1
       WHEN "bilirrubinaMgDl" <= 3   THEN 2
       ELSE 3 END
  WHERE "bilirrubinaMgDl" IS NOT NULL;

UPDATE "paciente" SET "albuminaPuntos" =
  CASE WHEN "albuminaGDl" >  3.5 THEN 1
       WHEN "albuminaGDl" >= 2.8 THEN 2
       ELSE 3 END
  WHERE "albuminaGDl" IS NOT NULL;

UPDATE "paciente" SET "inrPuntos" =
  CASE WHEN "inr" <  1.7 THEN 1
       WHEN "inr" <= 2.3 THEN 2
       ELSE 3 END
  WHERE "inr" IS NOT NULL;
