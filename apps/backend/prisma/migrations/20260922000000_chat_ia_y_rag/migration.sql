-- CreateEnum
CREATE TYPE "RolMensajeChat" AS ENUM ('USUARIO', 'ASISTENTE');

-- CreateTable
CREATE TABLE "ficha_embedding" (
    "id" TEXT NOT NULL,
    "principioActivoId" TEXT NOT NULL,
    "chunkIndice" INTEGER NOT NULL,
    "textoChunk" TEXT NOT NULL,
    "embedding" vector(512) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ficha_embedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_session" (
    "id" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "titulo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL,
    "chatSessionId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "rol" "RolMensajeChat" NOT NULL,
    "contenido" TEXT NOT NULL,
    "toolLlamada" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ficha_embedding_principioActivoId_chunkIndice_key" ON "ficha_embedding"("principioActivoId", "chunkIndice");

-- CreateIndex
CREATE INDEX "chat_session_medicoId_createdAt_idx" ON "chat_session"("medicoId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_message_chatSessionId_createdAt_idx" ON "chat_message"("chatSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ficha_embedding" ADD CONSTRAINT "ficha_embedding_principioActivoId_fkey" FOREIGN KEY ("principioActivoId") REFERENCES "principio_activo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "chat_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
