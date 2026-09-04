-- La monografia: el texto descriptivo de un farmaco, para LEER.
--
-- Es lo unico del catalogo que no se cruza contra el paciente. El resto de las
-- tablas responde "¿esto es seguro para este paciente?"; esta responde "¿que
-- es esto?". Por eso no tiene severidad, ni semanas, ni rangos: es prosa, y se
-- guarda partida en los mismos campos en que viene la fuente para poder
-- mostrarla por secciones sin volver a parsearla en cada pantalla.
--
-- Cuelga del PRINCIPIO ACTIVO y no del producto comercial: dos marcas del
-- mismo farmaco comparten monografia. Una fila por principio activo, de ahi
-- el UNIQUE.
--
-- Todos los campos son opcionales a proposito: una ficha real puede no traer
-- alguno, y un campo vacio tiene que poder distinguirse de un campo con texto.
-- La pantalla no muestra la seccion que no tiene contenido.
CREATE TABLE "monografia_farmaco" (
    "id" TEXT NOT NULL,
    "principioActivoId" TEXT NOT NULL,
    "descripcion" TEXT,
    "usos" TEXT,
    "posologia" TEXT,
    "precauciones" TEXT,
    "contraindicaciones" TEXT,
    "reaccionesAdversas" TEXT,
    "interacciones" TEXT,
    "embarazo" TEXT,
    "lactancia" TEXT,
    "fuente" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monografia_farmaco_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "monografia_farmaco_principioActivoId_key"
  ON "monografia_farmaco"("principioActivoId");

ALTER TABLE "monografia_farmaco"
  ADD CONSTRAINT "monografia_farmaco_principioActivoId_fkey"
  FOREIGN KEY ("principioActivoId") REFERENCES "principio_activo"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
