-- AlterTable
ALTER TABLE "repuestos" ADD COLUMN     "cajaMovimientoId" TEXT,
ADD COLUMN     "fechaCompra" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "repuestos_cajaMovimientoId_key" ON "repuestos"("cajaMovimientoId");

-- AddForeignKey
ALTER TABLE "repuestos" ADD CONSTRAINT "repuestos_cajaMovimientoId_fkey" FOREIGN KEY ("cajaMovimientoId") REFERENCES "caja_movimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

