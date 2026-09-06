ALTER TYPE "AgendaEventoTipo" ADD VALUE 'fechaClave';
ALTER TABLE "agenda_eventos"
  ADD COLUMN "titulo" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "recordarDiasAntes" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "cancelado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "registradoPor" TEXT,
  ADD COLUMN "actualizadoPor" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "agenda_eventos_edicionId_fecha_idx" ON "agenda_eventos"("edicionId", "fecha");
