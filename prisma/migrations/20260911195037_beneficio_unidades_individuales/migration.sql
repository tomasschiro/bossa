-- Sistema de números individuales de rifa/beneficio distribuido.
-- Migración puramente aditiva: no hay datos existentes en
-- beneficio_distribuido_tipos/vendedores/ventas (0 filas), por lo que no
-- requiere backfill.

-- CreateEnum
CREATE TYPE "BeneficioUnidadEstado" AS ENUM ('Sin asignar', 'Asignado', 'Vendido', 'Devuelto');

-- AlterTable
ALTER TABLE "beneficio_distribuido_tipos"
  ADD COLUMN "trackearNumeros" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rangoDesde" INTEGER,
  ADD COLUMN "rangoHasta" INTEGER;

-- CreateTable
CREATE TABLE "beneficio_distribuido_unidades" (
    "id" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" "BeneficioUnidadEstado" NOT NULL DEFAULT 'Sin asignar',
    "vendedorId" TEXT,
    "ventaId" TEXT,

    CONSTRAINT "beneficio_distribuido_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beneficio_distribuido_unidades_ventaId_key" ON "beneficio_distribuido_unidades"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "beneficio_distribuido_unidades_tipoId_numero_key" ON "beneficio_distribuido_unidades"("tipoId", "numero");

-- AddForeignKey
ALTER TABLE "beneficio_distribuido_unidades" ADD CONSTRAINT "beneficio_distribuido_unidades_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "beneficio_distribuido_tipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficio_distribuido_unidades" ADD CONSTRAINT "beneficio_distribuido_unidades_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "beneficio_distribuido_vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficio_distribuido_unidades" ADD CONSTRAINT "beneficio_distribuido_unidades_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "beneficio_distribuido_ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
