-- CreateEnum
CREATE TYPE "RolMedico" AS ENUM ('GUEST', 'USER', 'PREMIUM', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "EstadoMedico" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'ELIMINADO');

-- CreateEnum
CREATE TYPE "StoreSuscripcion" AS ENUM ('APP_STORE', 'PLAY_STORE');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('ACTIVA', 'GRACIA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_CANCELLED', 'TREATMENT_LOADED_VIA_PHOTO', 'ALTERNATIVA_ACEPTADA', 'ADMIN_ACTION', 'ERROR');

-- CreateEnum
CREATE TYPE "TemaUI" AS ENUM ('CLARO', 'OSCURO', 'SISTEMA');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('M', 'F', 'OTRO');

-- CreateEnum
CREATE TYPE "ClcrOrigen" AS ENUM ('CALCULADO_COCKCROFT', 'INGRESADO_MANUAL');

-- CreateEnum
CREATE TYPE "ChildPughClase" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "OrigenCalculo" AS ENUM ('CALCULADO', 'INGRESADO_MANUAL');

-- CreateEnum
CREATE TYPE "Ascitis" AS ENUM ('AUSENTE', 'LEVE', 'MODERADA_SEVERA');

-- CreateEnum
CREATE TYPE "Encefalopatia" AS ENUM ('AUSENTE', 'GRADO_1_2', 'GRADO_3_4');

-- CreateEnum
CREATE TYPE "EstadoPrescripcion" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "MetodoAjuste" AS ENUM ('D', 'I', 'D_E_I', 'NO', 'NOTA_AL_PIE');

-- CreateEnum
CREATE TYPE "TipoRangoAjuste" AS ENUM ('SIN_AJUSTE', 'REDUCIR_DOSIS', 'AUMENTAR_INTERVALO', 'REDUCIR_DOSIS_Y_INTERVALO', 'EVITAR', 'CONTRAINDICADO', 'PRECAUCION', 'CONDICIONAL', 'VACIO', 'NOTA_AL_PIE');

-- CreateEnum
CREATE TYPE "ViaAdministracion" AS ENUM ('NO_ESPECIFICADA', 'ORAL', 'IV', 'SC', 'TOPICA', 'INHALATORIA', 'INTRAOCULAR', 'OTRA', 'IM', 'SUBLINGUAL', 'RECTAL', 'VAGINAL', 'NASAL', 'TRANSDERMICA', 'OFTALMICA', 'OTICA');

-- CreateEnum
CREATE TYPE "SeveridadAlerta" AS ENUM ('INFO', 'PRECAUCION', 'EVITAR', 'CONTRAINDICADO');

-- CreateEnum
CREATE TYPE "SeveridadInteraccion" AS ENUM ('INFORMATIVA', 'ALTA', 'CONTRAINDICADA');

-- CreateEnum
CREATE TYPE "NivelCruce" AS ENUM ('ALTO', 'MODERADO', 'BAJO');

-- CreateEnum
CREATE TYPE "TipoAlergia" AS ENUM ('FARMACOLOGICA', 'GENERAL');

-- CreateEnum
CREATE TYPE "SeveridadAlergia" AS ENUM ('LEVE', 'MODERADA', 'GRAVE');

-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "principio_activo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreNormalizado" TEXT NOT NULL,
    "grupoTerapeutico" TEXT,
    "viaDefault" "ViaAdministracion" NOT NULL DEFAULT 'NO_ESPECIFICADA',
    "tieneAjusteRenal" BOOLEAN NOT NULL DEFAULT false,
    "tieneAjusteHepatico" BOOLEAN NOT NULL DEFAULT false,
    "codigoATC" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "principio_activo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_comercial" (
    "id" TEXT NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "nombreNormalizado" TEXT NOT NULL,
    "laboratorio" TEXT,
    "formaFarmaceutica" TEXT,
    "dosisTexto" TEXT,
    "codigoApiExterna" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producto_comercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_comercial_principio_activo" (
    "productoComercialId" TEXT NOT NULL,
    "principioActivoId" TEXT NOT NULL,

    CONSTRAINT "producto_comercial_principio_activo_pkey" PRIMARY KEY ("productoComercialId","principioActivoId")
);

-- CreateTable
CREATE TABLE "ajuste_renal_farmaco" (
    "id" TEXT NOT NULL,
    "principioActivoId" TEXT NOT NULL,
    "dosisFrNormal" TEXT NOT NULL,
    "metodoAjuste" "MetodoAjuste" NOT NULL,
    "viaAdministracion" "ViaAdministracion" NOT NULL DEFAULT 'NO_ESPECIFICADA',
    "suplementoHd" TEXT,
    "observaciones" TEXT,
    "requiereRevision" BOOLEAN NOT NULL DEFAULT false,
    "tablaOrigenNum" INTEGER,
    "estadoValidacion" "EstadoValidacion" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ajuste_renal_farmaco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rango_clcr_farmaco" (
    "id" TEXT NOT NULL,
    "ajusteRenalFarmacoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "clcrMin" INTEGER,
    "clcrMax" INTEGER,
    "rangoTexto" TEXT NOT NULL,
    "textoRecomendacion" TEXT,
    "tipo" "TipoRangoAjuste" NOT NULL,

    CONSTRAINT "rango_clcr_farmaco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajuste_hepatico_farmaco" (
    "id" TEXT NOT NULL,
    "principioActivoId" TEXT NOT NULL,
    "viaAdministracion" "ViaAdministracion" NOT NULL DEFAULT 'NO_ESPECIFICADA',
    "dosisFuncionNormal" TEXT NOT NULL,
    "metodoAjuste" "MetodoAjuste" NOT NULL,
    "observaciones" TEXT,
    "requiereRevision" BOOLEAN NOT NULL DEFAULT false,
    "fuenteOrigen" TEXT,
    "estadoValidacion" "EstadoValidacion" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ajuste_hepatico_farmaco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rango_child_pugh_farmaco" (
    "id" TEXT NOT NULL,
    "ajusteHepaticoFarmacoId" TEXT NOT NULL,
    "clase" "ChildPughClase" NOT NULL,
    "textoRecomendacion" TEXT,
    "tipo" "TipoRangoAjuste" NOT NULL,

    CONSTRAINT "rango_child_pugh_farmaco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condicion_clinica" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condicion_clinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerta_condicion_farmaco" (
    "id" TEXT NOT NULL,
    "principioActivoId" TEXT NOT NULL,
    "condicionClinicaId" TEXT NOT NULL,
    "severidad" "SeveridadAlerta" NOT NULL,
    "texto" TEXT NOT NULL,
    "fuente" TEXT,
    "semanaMin" INTEGER,
    "semanaMax" INTEGER,
    "estadoValidacion" "EstadoValidacion" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerta_condicion_farmaco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo_alergenico" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivelCruce" "NivelCruce" NOT NULL,
    "grupoPadreId" TEXT,
    "sinonimos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupo_alergenico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "principio_activo_grupo_alergenico" (
    "principioActivoId" TEXT NOT NULL,
    "grupoAlergenicoId" TEXT NOT NULL,

    CONSTRAINT "principio_activo_grupo_alergenico_pkey" PRIMARY KEY ("principioActivoId","grupoAlergenicoId")
);

-- CreateTable
CREATE TABLE "alternativa_terapeutica" (
    "id" TEXT NOT NULL,
    "paOrigenId" TEXT NOT NULL,
    "paAlternativaId" TEXT NOT NULL,
    "razon" TEXT NOT NULL,
    "evidencia" TEXT,
    "severidadOriginalAplicable" "SeveridadAlerta",
    "estadoValidacion" "EstadoValidacion" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alternativa_terapeutica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaccion_curada" (
    "id" TEXT NOT NULL,
    "parClave" TEXT NOT NULL,
    "rechazado" BOOLEAN NOT NULL DEFAULT false,
    "severidadOverride" "SeveridadInteraccion",
    "textoOverride" TEXT,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interaccion_curada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medico" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombreUsuario" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "RolMedico" NOT NULL DEFAULT 'USER',
    "estado" "EstadoMedico" NOT NULL DEFAULT 'ACTIVO',
    "disclaimerVersion" TEXT,
    "disclaimerAceptadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "dispositivoInfo" TEXT,
    "creadaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraAt" TIMESTAMP(3) NOT NULL,
    "revocadaAt" TIMESTAMP(3),
    "ultimoUsoAt" TIMESTAMP(3),

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripcion" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "store" "StoreSuscripcion" NOT NULL,
    "estado" "EstadoSuscripcion" NOT NULL,
    "periodoActualFin" TIMESTAMP(3) NOT NULL,
    "actualizadaAt" TIMESTAMP(3) NOT NULL,
    "ultimoEventoId" TEXT,
    "ultimoEventoTipo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "accion" "AccionAuditoria" NOT NULL,
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_usuario" (
    "medicoId" TEXT NOT NULL,
    "tema" "TemaUI" NOT NULL DEFAULT 'SISTEMA',
    "notificacionesPush" BOOLEAN NOT NULL DEFAULT true,
    "umbralAdultoMayor" INTEGER NOT NULL DEFAULT 65,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_usuario_pkey" PRIMARY KEY ("medicoId")
);

-- CreateTable
CREATE TABLE "grupo" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paciente" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "grupoId" TEXT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "documento" TEXT,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "alturaCm" INTEGER,
    "pesoKg" DECIMAL(5,2),
    "creatininaMgDl" DECIMAL(4,2),
    "clcrMlMin" DECIMAL(5,1),
    "clcrOrigen" "ClcrOrigen",
    "clcrMedidoAt" TIMESTAMP(3),
    "bilirrubinaMgDl" DECIMAL(5,2),
    "albuminaGDl" DECIMAL(4,2),
    "inr" DECIMAL(4,2),
    "ascitis" "Ascitis",
    "encefalopatia" "Encefalopatia",
    "childPughClase" "ChildPughClase",
    "childPughOrigen" "OrigenCalculo",
    "childPughMedidoAt" TIMESTAMP(3),
    "semanaGestacion" INTEGER,
    "estaLactando" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescripcion" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "productoComercialId" TEXT,
    "esFarmacoLibre" BOOLEAN NOT NULL DEFAULT false,
    "nombreLibre" TEXT,
    "dosis" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "via" "ViaAdministracion" NOT NULL,
    "indicacion" TEXT,
    "estado" "EstadoPrescripcion" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condicion_paciente" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "condicionClinicaId" TEXT NOT NULL,
    "fechaDiagnostico" TIMESTAMP(3),
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condicion_paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alergia" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" "TipoAlergia" NOT NULL,
    "severidad" "SeveridadAlergia" NOT NULL,
    "principioActivoId" TEXT,
    "grupoAlergenicoId" TEXT,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alergia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaccion_detectada" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "prescripcionAId" TEXT NOT NULL,
    "prescripcionBId" TEXT NOT NULL,
    "principioActivoAId" TEXT NOT NULL,
    "principioActivoBId" TEXT NOT NULL,
    "severidad" "SeveridadInteraccion" NOT NULL,
    "texto" TEXT NOT NULL,
    "fuente" TEXT,
    "vista" BOOLEAN NOT NULL DEFAULT false,
    "vistaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interaccion_detectada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternativa_aceptada" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "prescripcionOrigenId" TEXT,
    "paOrigenId" TEXT NOT NULL,
    "paAlternativaId" TEXT NOT NULL,
    "disclaimerVersion" TEXT NOT NULL,
    "aceptadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT,

    CONSTRAINT "alternativa_aceptada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "principio_activo_nombre_key" ON "principio_activo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "principio_activo_nombreNormalizado_key" ON "principio_activo"("nombreNormalizado");

-- CreateIndex
CREATE INDEX "principio_activo_codigoATC_idx" ON "principio_activo"("codigoATC");

-- CreateIndex
CREATE INDEX "principio_activo_grupoTerapeutico_idx" ON "principio_activo"("grupoTerapeutico");

-- CreateIndex
CREATE UNIQUE INDEX "producto_comercial_codigoApiExterna_key" ON "producto_comercial"("codigoApiExterna");

-- CreateIndex
CREATE INDEX "producto_comercial_nombreNormalizado_idx" ON "producto_comercial"("nombreNormalizado");

-- CreateIndex
CREATE UNIQUE INDEX "producto_comercial_nombreNormalizado_laboratorio_dosisTexto_key" ON "producto_comercial"("nombreNormalizado", "laboratorio", "dosisTexto", "formaFarmaceutica");

-- CreateIndex
CREATE INDEX "producto_comercial_principio_activo_principioActivoId_idx" ON "producto_comercial_principio_activo"("principioActivoId");

-- CreateIndex
CREATE INDEX "ajuste_renal_farmaco_principioActivoId_idx" ON "ajuste_renal_farmaco"("principioActivoId");

-- CreateIndex
CREATE UNIQUE INDEX "ajuste_renal_farmaco_principioActivoId_viaAdministracion_key" ON "ajuste_renal_farmaco"("principioActivoId", "viaAdministracion");

-- CreateIndex
CREATE INDEX "rango_clcr_farmaco_ajusteRenalFarmacoId_idx" ON "rango_clcr_farmaco"("ajusteRenalFarmacoId");

-- CreateIndex
CREATE UNIQUE INDEX "rango_clcr_farmaco_ajusteRenalFarmacoId_orden_key" ON "rango_clcr_farmaco"("ajusteRenalFarmacoId", "orden");

-- CreateIndex
CREATE INDEX "ajuste_hepatico_farmaco_principioActivoId_idx" ON "ajuste_hepatico_farmaco"("principioActivoId");

-- CreateIndex
CREATE UNIQUE INDEX "ajuste_hepatico_farmaco_principioActivoId_viaAdministracion_key" ON "ajuste_hepatico_farmaco"("principioActivoId", "viaAdministracion");

-- CreateIndex
CREATE INDEX "rango_child_pugh_farmaco_ajusteHepaticoFarmacoId_idx" ON "rango_child_pugh_farmaco"("ajusteHepaticoFarmacoId");

-- CreateIndex
CREATE UNIQUE INDEX "rango_child_pugh_farmaco_ajusteHepaticoFarmacoId_clase_key" ON "rango_child_pugh_farmaco"("ajusteHepaticoFarmacoId", "clase");

-- CreateIndex
CREATE UNIQUE INDEX "condicion_clinica_codigo_key" ON "condicion_clinica"("codigo");

-- CreateIndex
CREATE INDEX "alerta_condicion_farmaco_principioActivoId_condicionClinica_idx" ON "alerta_condicion_farmaco"("principioActivoId", "condicionClinicaId");

-- CreateIndex
CREATE INDEX "alerta_condicion_farmaco_condicionClinicaId_idx" ON "alerta_condicion_farmaco"("condicionClinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_alergenico_codigo_key" ON "grupo_alergenico"("codigo");

-- CreateIndex
CREATE INDEX "grupo_alergenico_grupoPadreId_idx" ON "grupo_alergenico"("grupoPadreId");

-- CreateIndex
CREATE INDEX "principio_activo_grupo_alergenico_grupoAlergenicoId_idx" ON "principio_activo_grupo_alergenico"("grupoAlergenicoId");

-- CreateIndex
CREATE INDEX "alternativa_terapeutica_paOrigenId_idx" ON "alternativa_terapeutica"("paOrigenId");

-- CreateIndex
CREATE UNIQUE INDEX "alternativa_terapeutica_paOrigenId_paAlternativaId_key" ON "alternativa_terapeutica"("paOrigenId", "paAlternativaId");

-- CreateIndex
CREATE UNIQUE INDEX "interaccion_curada_parClave_key" ON "interaccion_curada"("parClave");

-- CreateIndex
CREATE UNIQUE INDEX "medico_email_key" ON "medico"("email");

-- CreateIndex
CREATE UNIQUE INDEX "medico_nombreUsuario_key" ON "medico"("nombreUsuario");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_refreshTokenHash_key" ON "sesion"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "sesion_medicoId_revocadaAt_idx" ON "sesion"("medicoId", "revocadaAt");

-- CreateIndex
CREATE INDEX "sesion_expiraAt_idx" ON "sesion"("expiraAt");

-- CreateIndex
CREATE UNIQUE INDEX "suscripcion_medicoId_key" ON "suscripcion"("medicoId");

-- CreateIndex
CREATE INDEX "suscripcion_estado_idx" ON "suscripcion"("estado");

-- CreateIndex
CREATE INDEX "audit_log_medicoId_createdAt_idx" ON "audit_log"("medicoId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_accion_createdAt_idx" ON "audit_log"("accion", "createdAt");

-- CreateIndex
CREATE INDEX "grupo_medicoId_idx" ON "grupo"("medicoId");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_medicoId_nombre_key" ON "grupo"("medicoId", "nombre");

-- CreateIndex
CREATE INDEX "paciente_medicoId_apellido_nombre_idx" ON "paciente"("medicoId", "apellido", "nombre");

-- CreateIndex
CREATE INDEX "paciente_medicoId_grupoId_idx" ON "paciente"("medicoId", "grupoId");

-- CreateIndex
CREATE INDEX "prescripcion_medicoId_pacienteId_estado_idx" ON "prescripcion"("medicoId", "pacienteId", "estado");

-- CreateIndex
CREATE INDEX "prescripcion_productoComercialId_idx" ON "prescripcion"("productoComercialId");

-- CreateIndex
CREATE INDEX "condicion_paciente_medicoId_pacienteId_activo_idx" ON "condicion_paciente"("medicoId", "pacienteId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "condicion_paciente_pacienteId_condicionClinicaId_key" ON "condicion_paciente"("pacienteId", "condicionClinicaId");

-- CreateIndex
CREATE INDEX "alergia_medicoId_pacienteId_activo_idx" ON "alergia"("medicoId", "pacienteId", "activo");

-- CreateIndex
CREATE INDEX "interaccion_detectada_medicoId_pacienteId_idx" ON "interaccion_detectada"("medicoId", "pacienteId");

-- CreateIndex
CREATE INDEX "interaccion_detectada_pacienteId_vista_idx" ON "interaccion_detectada"("pacienteId", "vista");

-- CreateIndex
CREATE UNIQUE INDEX "interaccion_detectada_prescripcionAId_prescripcionBId_princ_key" ON "interaccion_detectada"("prescripcionAId", "prescripcionBId", "principioActivoAId", "principioActivoBId");

-- CreateIndex
CREATE INDEX "alternativa_aceptada_medicoId_pacienteId_idx" ON "alternativa_aceptada"("medicoId", "pacienteId");

-- CreateIndex
CREATE INDEX "alternativa_aceptada_pacienteId_paOrigenId_idx" ON "alternativa_aceptada"("pacienteId", "paOrigenId");

-- AddForeignKey
ALTER TABLE "producto_comercial_principio_activo" ADD CONSTRAINT "producto_comercial_principio_activo_productoComercialId_fkey" FOREIGN KEY ("productoComercialId") REFERENCES "producto_comercial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_comercial_principio_activo" ADD CONSTRAINT "producto_comercial_principio_activo_principioActivoId_fkey" FOREIGN KEY ("principioActivoId") REFERENCES "principio_activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajuste_renal_farmaco" ADD CONSTRAINT "ajuste_renal_farmaco_principioActivoId_fkey" FOREIGN KEY ("principioActivoId") REFERENCES "principio_activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rango_clcr_farmaco" ADD CONSTRAINT "rango_clcr_farmaco_ajusteRenalFarmacoId_fkey" FOREIGN KEY ("ajusteRenalFarmacoId") REFERENCES "ajuste_renal_farmaco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajuste_hepatico_farmaco" ADD CONSTRAINT "ajuste_hepatico_farmaco_principioActivoId_fkey" FOREIGN KEY ("principioActivoId") REFERENCES "principio_activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rango_child_pugh_farmaco" ADD CONSTRAINT "rango_child_pugh_farmaco_ajusteHepaticoFarmacoId_fkey" FOREIGN KEY ("ajusteHepaticoFarmacoId") REFERENCES "ajuste_hepatico_farmaco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_condicion_farmaco" ADD CONSTRAINT "alerta_condicion_farmaco_principioActivoId_fkey" FOREIGN KEY ("principioActivoId") REFERENCES "principio_activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_condicion_farmaco" ADD CONSTRAINT "alerta_condicion_farmaco_condicionClinicaId_fkey" FOREIGN KEY ("condicionClinicaId") REFERENCES "condicion_clinica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo_alergenico" ADD CONSTRAINT "grupo_alergenico_grupoPadreId_fkey" FOREIGN KEY ("grupoPadreId") REFERENCES "grupo_alergenico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "principio_activo_grupo_alergenico" ADD CONSTRAINT "principio_activo_grupo_alergenico_principioActivoId_fkey" FOREIGN KEY ("principioActivoId") REFERENCES "principio_activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "principio_activo_grupo_alergenico" ADD CONSTRAINT "principio_activo_grupo_alergenico_grupoAlergenicoId_fkey" FOREIGN KEY ("grupoAlergenicoId") REFERENCES "grupo_alergenico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternativa_terapeutica" ADD CONSTRAINT "alternativa_terapeutica_paOrigenId_fkey" FOREIGN KEY ("paOrigenId") REFERENCES "principio_activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternativa_terapeutica" ADD CONSTRAINT "alternativa_terapeutica_paAlternativaId_fkey" FOREIGN KEY ("paAlternativaId") REFERENCES "principio_activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripcion" ADD CONSTRAINT "suscripcion_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_usuario" ADD CONSTRAINT "configuracion_usuario_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo" ADD CONSTRAINT "grupo_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescripcion" ADD CONSTRAINT "prescripcion_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescripcion" ADD CONSTRAINT "prescripcion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescripcion" ADD CONSTRAINT "prescripcion_productoComercialId_fkey" FOREIGN KEY ("productoComercialId") REFERENCES "producto_comercial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicion_paciente" ADD CONSTRAINT "condicion_paciente_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicion_paciente" ADD CONSTRAINT "condicion_paciente_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicion_paciente" ADD CONSTRAINT "condicion_paciente_condicionClinicaId_fkey" FOREIGN KEY ("condicionClinicaId") REFERENCES "condicion_clinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alergia" ADD CONSTRAINT "alergia_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alergia" ADD CONSTRAINT "alergia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alergia" ADD CONSTRAINT "alergia_principioActivoId_fkey" FOREIGN KEY ("principioActivoId") REFERENCES "principio_activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alergia" ADD CONSTRAINT "alergia_grupoAlergenicoId_fkey" FOREIGN KEY ("grupoAlergenicoId") REFERENCES "grupo_alergenico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaccion_detectada" ADD CONSTRAINT "interaccion_detectada_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaccion_detectada" ADD CONSTRAINT "interaccion_detectada_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaccion_detectada" ADD CONSTRAINT "interaccion_detectada_prescripcionAId_fkey" FOREIGN KEY ("prescripcionAId") REFERENCES "prescripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaccion_detectada" ADD CONSTRAINT "interaccion_detectada_prescripcionBId_fkey" FOREIGN KEY ("prescripcionBId") REFERENCES "prescripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaccion_detectada" ADD CONSTRAINT "interaccion_detectada_principioActivoAId_fkey" FOREIGN KEY ("principioActivoAId") REFERENCES "principio_activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaccion_detectada" ADD CONSTRAINT "interaccion_detectada_principioActivoBId_fkey" FOREIGN KEY ("principioActivoBId") REFERENCES "principio_activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternativa_aceptada" ADD CONSTRAINT "alternativa_aceptada_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternativa_aceptada" ADD CONSTRAINT "alternativa_aceptada_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternativa_aceptada" ADD CONSTRAINT "alternativa_aceptada_prescripcionOrigenId_fkey" FOREIGN KEY ("prescripcionOrigenId") REFERENCES "prescripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternativa_aceptada" ADD CONSTRAINT "alternativa_aceptada_paOrigenId_fkey" FOREIGN KEY ("paOrigenId") REFERENCES "principio_activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternativa_aceptada" ADD CONSTRAINT "alternativa_aceptada_paAlternativaId_fkey" FOREIGN KEY ("paAlternativaId") REFERENCES "principio_activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
