-- Prepara el catálogo para cuando se conecte la API de Farmanuario (guía
-- técnica "GuiaTecnica_V10_Agosto_2026") — sólo agrega, no cambia nada de lo
-- que ya funciona. Ver comentarios en schema.prisma sobre cada campo.
--
-- CondicionVenta: la guía distingue Control Médico Recomendado (CMR) de
-- Receta, y separa Psicofármaco (PS) de Estupefaciente (ES) en vez de un
-- genérico "controlada". Sólo se agregan valores — Postgres no permite sacar
-- uno de un enum sin recrear el tipo, y RECETA_CONTROLADA queda sin uso pero
-- sin romper nada por quedarse.
ALTER TYPE "CondicionVenta" ADD VALUE IF NOT EXISTS 'CONTROL_MEDICO_RECOMENDADO';
ALTER TYPE "CondicionVenta" ADD VALUE IF NOT EXISTS 'PSICOFARMACO';
ALTER TYPE "CondicionVenta" ADD VALUE IF NOT EXISTS 'ESTUPEFACIENTE';

-- Estado del producto según el proveedor (ESTADO_PRODUCTO: A/T/DN/B) — más
-- fino que el booleano `vigente`, que sigue siendo el que usa el resto de la
-- app. Ver comentario del campo en schema.prisma.
CREATE TYPE "EstadoProducto" AS ENUM (
  'ACTIVO',
  'BAJA_TEMPORAL',
  'DISCONTINUADO',
  'BAJA_DEFINITIVA'
);

ALTER TABLE "producto_comercial" ADD COLUMN "estadoProveedor" "EstadoProducto";
ALTER TABLE "producto_comercial" ADD COLUMN "codigoBarras" TEXT;
ALTER TABLE "producto_comercial" ADD COLUMN "registroMsp" TEXT;

ALTER TABLE "principio_activo" ADD COLUMN "codFtm" TEXT;
ALTER TABLE "principio_activo" ADD COLUMN "capitulo" TEXT;
ALTER TABLE "principio_activo" ADD COLUMN "accionTerapeutica" TEXT;
ALTER TABLE "principio_activo" ADD COLUMN "definicionCorta" TEXT;
