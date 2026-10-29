-- CreateEnum
CREATE TYPE "InscripcionEstado" AS ENUM ('Pendiente', 'Aprobada', 'Rechazada');

-- AlterTable
ALTER TABLE "ritmistas" ADD COLUMN     "email" TEXT,
ADD COLUMN     "fotoId" TEXT,
ADD COLUMN     "telefonoTutor" TEXT;

-- CreateTable
CREATE TABLE "fotos_ritmistas" (
    "id" TEXT NOT NULL,
    "bateriaId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "datos" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_ritmistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" TEXT NOT NULL,
    "bateriaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "naipe" TEXT NOT NULL,
    "talleRemera" TEXT NOT NULL,
    "calzado" TEXT NOT NULL,
    "telefonoTutor" TEXT,
    "fotoId" TEXT,
    "estado" "InscripcionEstado" NOT NULL DEFAULT 'Pendiente',
    "ipHash" TEXT NOT NULL,
    "ritmistaId" TEXT,
    "revisadoPorId" TEXT,
    "revisadoPor" TEXT,
    "revisadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_fotoId_key" ON "inscripciones"("fotoId");

-- CreateIndex
CREATE INDEX "inscripciones_bateriaId_estado_idx" ON "inscripciones"("bateriaId", "estado");

-- CreateIndex
CREATE INDEX "inscripciones_bateriaId_dni_idx" ON "inscripciones"("bateriaId", "dni");

-- CreateIndex
CREATE INDEX "inscripciones_ipHash_createdAt_idx" ON "inscripciones"("ipHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ritmistas_fotoId_key" ON "ritmistas"("fotoId");

-- AddForeignKey
ALTER TABLE "ritmistas" ADD CONSTRAINT "ritmistas_fotoId_fkey" FOREIGN KEY ("fotoId") REFERENCES "fotos_ritmistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_ritmistas" ADD CONSTRAINT "fotos_ritmistas_bateriaId_fkey" FOREIGN KEY ("bateriaId") REFERENCES "baterias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_bateriaId_fkey" FOREIGN KEY ("bateriaId") REFERENCES "baterias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_fotoId_fkey" FOREIGN KEY ("fotoId") REFERENCES "fotos_ritmistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

