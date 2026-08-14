-- Búsqueda por trigrama sobre los nombres normalizados del catálogo.
--
-- Por qué trigram y no full text search: `tsvector` busca PALABRAS con raíces,
-- y para predictivo hay que usar prefijo (`ibu:*`), que no encuentra
-- coincidencias en el medio de una palabra — «pirac» dejaría de encontrar
-- «Ibupirac», que hoy sí funciona. Los nombres de fármaco son una o dos
-- palabras sin gramática: no hay nada que stemmear y sí mucho que buscar por
-- adentro. Trigram hace las dos cosas y además tolera errores de tipeo.
--
-- Sin este índice, `LIKE '%texto%'` no puede usar el B-tree de
-- `nombreNormalizado` —el comodín va adelante— y termina en scan secuencial.
-- Con 638 productos eso son microsegundos y no se nota; el índice está para el
-- día en que el catálogo sea un vademécum de verdad.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "producto_comercial_nombre_trgm"
  ON "producto_comercial" USING GIN ("nombreNormalizado" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "principio_activo_nombre_trgm"
  ON "principio_activo" USING GIN ("nombreNormalizado" gin_trgm_ops);
