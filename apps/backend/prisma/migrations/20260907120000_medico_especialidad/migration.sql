-- Especialidad del médico, opcional.
--
-- Se usa para reordenar la pantalla de Herramientas por relevancia — nunca
-- para filtrar: las que cruzan el catálogo (interacciones, condición/alergia,
-- ajuste renal/hepático) las usa cualquier especialidad por igual.
--
-- Nullable a propósito: las cuentas ya registradas no la tienen y no hay
-- forma honesta de inferirla. Sin dato, Herramientas se muestra en el mismo
-- orden alfabético de siempre.
ALTER TABLE "medico" ADD COLUMN "especialidad" TEXT;
