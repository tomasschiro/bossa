/*
  Warnings:

  - You are about to drop the `rifas` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `categoria` on the `caja_movimientos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PresupuestoRubroTipo" AS ENUM ('Fantasia', 'Remeras');

-- CreateEnum
CREATE TYPE "CajaCategoria" AS ENUM ('Fantasía/temática', 'Trajes', 'Remeras', 'Instrumentos y repuestos', 'Ensayos/logística', 'Otros gastos generales');

-- DropForeignKey
ALTER TABLE "rifas" DROP CONSTRAINT "rifas_ritmistaEdicionId_fkey";

-- AlterTable
ALTER TABLE "caja_movimientos" DROP COLUMN "categoria",
ADD COLUMN     "categoria" "CajaCategoria" NOT NULL;

-- DropTable
DROP TABLE "rifas";

-- CreateTable
CREATE TABLE "presupuesto_rubros" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "rubro" "PresupuestoRubroTipo" NOT NULL,
    "montoEstimado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presupuesto_rubros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_gastos" (
    "id" TEXT NOT NULL,
    "presupuestoRubroId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cajaMovimientoId" TEXT,
    "registradoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presupuesto_gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficios_generales" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "objetivoRecaudacion" DECIMAL(12,2),
    "ingresoBruto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "agendaEventoId" TEXT,
    "cajaMovimientoId" TEXT,
    "registradoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficios_generales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficio_gastos" (
    "id" TEXT NOT NULL,
    "beneficioId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "beneficio_gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficio_distribuido_tipos" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioUnidad" DECIMAL(12,2) NOT NULL,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficio_distribuido_tipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficio_distribuido_vendedores" (
    "id" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "ritmistaEdicionId" TEXT,
    "nombreExterno" TEXT,
    "contactoExterno" TEXT,
    "unidadesAsignadas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficio_distribuido_vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficio_distribuido_ventas" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "unidades" INTEGER,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "movimientoCuentaCorrienteId" TEXT,
    "cajaMovimientoId" TEXT,
    "registradoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficio_distribuido_ventas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "presupuesto_rubros_edicionId_rubro_key" ON "presupuesto_rubros"("edicionId", "rubro");

-- CreateIndex
CREATE UNIQUE INDEX "presupuesto_gastos_cajaMovimientoId_key" ON "presupuesto_gastos"("cajaMovimientoId");

-- CreateIndex
CREATE UNIQUE INDEX "beneficios_generales_agendaEventoId_key" ON "beneficios_generales"("agendaEventoId");

-- CreateIndex
CREATE UNIQUE INDEX "beneficios_generales_cajaMovimientoId_key" ON "beneficios_generales"("cajaMovimientoId");

-- CreateIndex
CREATE UNIQUE INDEX "beneficio_distribuido_ventas_movimientoCuentaCorrienteId_key" ON "beneficio_distribuido_ventas"("movimientoCuentaCorrienteId");

-- CreateIndex
CREATE UNIQUE INDEX "beneficio_distribuido_ventas_cajaMovimientoId_key" ON "beneficio_distribuido_ventas"("cajaMovimientoId");

-- AddForeignKey
ALTER TABLE "presupuesto_rubros" ADD CONSTRAINT "presupuesto_rubros_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "ediciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_gastos" ADD CONSTRAINT "presupuesto_gastos_presupuestoRubroId_fkey" FOREIGN KEY ("presupuestoRubroId") REFERENCES "presupuesto_rubros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_gastos" ADD CONSTRAINT "presupuesto_gastos_cajaMovimientoId_fkey" FOREIGN KEY ("cajaMovimientoId") REFERENCES "caja_movimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficios_generales" ADD CONSTRAINT "beneficios_generales_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "ediciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficios_generales" ADD CONSTRAINT "beneficios_generales_agendaEventoId_fkey" FOREIGN KEY ("agendaEventoId") REFERENCES "agenda_eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficios_generales" ADD CONSTRAINT "beneficios_generales_cajaMovimientoId_fkey" FOREIGN KEY ("cajaMovimientoId") REFERENCES "caja_movimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficio_gastos" ADD CONSTRAINT "beneficio_gastos_beneficioId_fkey" FOREIGN KEY ("beneficioId") REFERENCES "beneficios_generales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficio_distribuido_tipos" ADD CONSTRAINT "beneficio_distribuido_tipos_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "ediciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficio_distribuido_vendedores" ADD CONSTRAINT "beneficio_distribuido_vendedores_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "beneficio_distribuido_tipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficio_distribuido_vendedores" ADD CONSTRAINT "beneficio_distribuido_vendedores_ritmistaEdicionId_fkey" FOREIGN KEY ("ritmistaEdicionId") REFERENCES "ritmistas_edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficio_distribuido_ventas" ADD CONSTRAINT "beneficio_distribuido_ventas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "beneficio_distribuido_vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficio_distribuido_ventas" ADD CONSTRAINT "beneficio_distribuido_ventas_movimientoCuentaCorrienteId_fkey" FOREIGN KEY ("movimientoCuentaCorrienteId") REFERENCES "movimientos_cuenta_corriente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficio_distribuido_ventas" ADD CONSTRAINT "beneficio_distribuido_ventas_cajaMovimientoId_fkey" FOREIGN KEY ("cajaMovimientoId") REFERENCES "caja_movimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
