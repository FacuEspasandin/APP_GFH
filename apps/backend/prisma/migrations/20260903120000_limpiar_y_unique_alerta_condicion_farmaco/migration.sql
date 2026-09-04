-- Limpieza de alerta_condicion_farmaco + índice único NULL-safe para que esta
-- clase de bug sea irrepetible.
--
-- Diagnóstico: el 2026-08-09 se cargaron 507 filas del catálogo curado
-- (docs/data/alertas-condicion-farmaco.json). El 2026-08-27 se cargó ENCIMA
-- un catálogo intermedio, sin deleteMany previo (seed.ts no tenía
-- protección — ver fix en seed.ts), dejando 204 filas de más con severidades
-- que no coincidían con el catálogo vigente ni entre sí para el mismo par.
-- Eso hacía que un paciente cuyo fármaco+condición pisara uno de esos pares
-- dañados recibiera DOS hallazgos — el correcto y el corrupto — y el peor
-- ganara tanto en la "espina" del fármaco como en el peor-por-categoría del
-- cockpit (todo se veía "Contraindicado").
--
-- La revisión posterior, fármaco por fármaco contra su ficha técnica real,
-- encontró que ninguno de los dos lotes viejos era enteramente confiable —
-- a veces ganaba el lote de 08-09, a veces el de 08-27 — así que en vez de
-- restaurar uno de los dos, se vacía la tabla entera y se resiembra desde el
-- JSON ya revisado (ver seed.ts sección 4). Seguro de hacer: las 711 filas
-- previas estaban 100% en estadoValidacion PENDIENTE (cero curación
-- farmacéutica que perder), y ningún otro modelo tiene una FK hacia
-- AlertaCondicionFarmaco.id.
--
-- Escrita a mano y aplicada con `migrate deploy` a propósito, mismo criterio
-- que 20260817010000_child_pugh_por_banda: `migrate dev` compara contra una
-- base sombra y en este proyecto propuso resetear el esquema por los índices
-- trigram hechos con SQL suelto.
DELETE FROM "alerta_condicion_farmaco";

-- Índice único NULL-safe. NO se declara como @@unique en schema.prisma: un
-- @@unique de Prisma genera un UNIQUE constraint plano, y en SQL NULL <> NULL
-- — la mayoría de las filas tiene semanaMin/semanaMax en null (la ventana de
-- gestación solo aplica a un puñado de condiciones, motor §6.3), así que dos
-- filas null/null no chocarían y el bug seguiría siendo posible para esos
-- pares. COALESCE trata null como -1 (nunca una semana real) para que el
-- índice sí las distinga. Mismo patrón que los índices trigram de
-- producto_comercial/principio_activo: vive en SQL crudo, documentado acá y
-- en el modelo, porque el DSL de Prisma no puede expresarlo.
CREATE UNIQUE INDEX IF NOT EXISTS "alerta_condicion_farmaco_par_ventana_key"
  ON "alerta_condicion_farmaco" (
    "principioActivoId",
    "condicionClinicaId",
    COALESCE("semanaMin", -1),
    COALESCE("semanaMax", -1)
  );
