-- CreateEnum
CREATE TYPE "Nivel" AS ENUM ('Principiante', 'Avanzado');

-- CreateEnum
CREATE TYPE "EstadoLlegada" AS ENUM ('Confirmado', 'En duda', 'No confirmado');

-- CreateEnum
CREATE TYPE "MovimientoTipo" AS ENUM ('traje', 'remera', 'rifa', 'pago', 'ajuste');

-- CreateEnum
CREATE TYPE "MovimientoEstado" AS ENUM ('Pagado', 'Pendiente', 'Parcial');

-- CreateEnum
CREATE TYPE "IndumentariaItem" AS ENUM ('Remera oficial', 'Pantalón', 'Zapatillas', 'Medias', 'Gorra', 'Accesorio de naipe');

-- CreateEnum
CREATE TYPE "EntregaEstado" AS ENUM ('Entregado', 'Pendiente');

-- CreateEnum
CREATE TYPE "BeneficioEstado" AS ENUM ('Rendido', 'Pendiente');

-- CreateEnum
CREATE TYPE "InstrumentoEstado" AS ENUM ('Bueno', 'Regular', 'Necesita reparación', 'De baja');

-- CreateEnum
CREATE TYPE "ItemEtiqueta" AS ENUM ('Necesidad', 'Para venta');

-- CreateEnum
CREATE TYPE "ItemPrioridad" AS ENUM ('Urgente', 'Deseable');

-- CreateEnum
CREATE TYPE "CajaMovimientoTipo" AS ENUM ('ingreso', 'egreso');

-- CreateEnum
CREATE TYPE "AgendaEventoTipo" AS ENUM ('ensayo', 'beneficio', 'presentacion');

-- CreateTable
CREATE TABLE "baterias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "comparsa" TEXT,
    "paletaColores" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baterias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "naipes" (
    "id" TEXT NOT NULL,
    "bateriaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "naipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ritmistas" (
    "id" TEXT NOT NULL,
    "bateriaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "naipeReferencia" TEXT NOT NULL,
    "nivel" "Nivel" NOT NULL DEFAULT 'Principiante',
    "talleRemera" TEXT NOT NULL,
    "calzado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ritmistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "naipe_historial" (
    "id" TEXT NOT NULL,
    "ritmistaId" TEXT NOT NULL,
    "naipe" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "desde" INTEGER NOT NULL,

    CONSTRAINT "naipe_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrumentos" (
    "id" TEXT NOT NULL,
    "bateriaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "estado" "InstrumentoEstado" NOT NULL DEFAULT 'Bueno',
    "etiqueta" "ItemEtiqueta",
    "prioridad" "ItemPrioridad",
    "costoEstimado" DECIMAL(12,2),

    CONSTRAINT "instrumentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repuestos" (
    "id" TEXT NOT NULL,
    "bateriaId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "etiqueta" "ItemEtiqueta",
    "prioridad" "ItemPrioridad",
    "costoEstimado" DECIMAL(12,2),

    CONSTRAINT "repuestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ediciones" (
    "id" TEXT NOT NULL,
    "bateriaId" TEXT NOT NULL,
    "anioCarnaval" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ediciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ritmistas_edicion" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "ritmistaId" TEXT NOT NULL,
    "naipe" TEXT NOT NULL,
    "estadoLlegada" "EstadoLlegada" NOT NULL DEFAULT 'No confirmado',
    "beneficiosAsignados" INTEGER NOT NULL DEFAULT 0,
    "beneficiosVendidos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ritmistas_edicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_cuenta_corriente" (
    "id" TEXT NOT NULL,
    "ritmistaEdicionId" TEXT NOT NULL,
    "tipo" "MovimientoTipo" NOT NULL,
    "concepto" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" "MovimientoEstado" NOT NULL,
    "registradoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_cuenta_corriente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas_indumentaria" (
    "id" TEXT NOT NULL,
    "ritmistaEdicionId" TEXT NOT NULL,
    "item" "IndumentariaItem" NOT NULL,
    "estado" "EntregaEstado" NOT NULL DEFAULT 'Pendiente',
    "fechaEntrega" TIMESTAMP(3),
    "entregadoPor" TEXT,

    CONSTRAINT "entregas_indumentaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficios_movimientos" (
    "id" TEXT NOT NULL,
    "ritmistaEdicionId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" "BeneficioEstado" NOT NULL,
    "registradoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficios_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_indumentaria" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "talle" TEXT NOT NULL,
    "cantidadStock" INTEGER NOT NULL DEFAULT 0,
    "cantidadEntregada" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stock_indumentaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rifas" (
    "id" TEXT NOT NULL,
    "ritmistaEdicionId" TEXT NOT NULL,
    "numerosAsignados" INTEGER NOT NULL DEFAULT 0,
    "numerosVendidos" INTEGER NOT NULL DEFAULT 0,
    "montoPorNumero" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "rifas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caja_movimientos" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "tipo" "CajaMovimientoTipo" NOT NULL,
    "categoria" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "registradoPor" TEXT NOT NULL,

    CONSTRAINT "caja_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_eventos" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "tipo" "AgendaEventoTipo" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT,
    "lugar" TEXT,
    "descripcion" TEXT,

    CONSTRAINT "agenda_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ediciones_bateriaId_anioCarnaval_key" ON "ediciones"("bateriaId", "anioCarnaval");

-- CreateIndex
CREATE UNIQUE INDEX "ritmistas_edicion_edicionId_ritmistaId_key" ON "ritmistas_edicion"("edicionId", "ritmistaId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_indumentaria_edicionId_talle_key" ON "stock_indumentaria"("edicionId", "talle");

-- AddForeignKey
ALTER TABLE "naipes" ADD CONSTRAINT "naipes_bateriaId_fkey" FOREIGN KEY ("bateriaId") REFERENCES "baterias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ritmistas" ADD CONSTRAINT "ritmistas_bateriaId_fkey" FOREIGN KEY ("bateriaId") REFERENCES "baterias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "naipe_historial" ADD CONSTRAINT "naipe_historial_ritmistaId_fkey" FOREIGN KEY ("ritmistaId") REFERENCES "ritmistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrumentos" ADD CONSTRAINT "instrumentos_bateriaId_fkey" FOREIGN KEY ("bateriaId") REFERENCES "baterias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repuestos" ADD CONSTRAINT "repuestos_bateriaId_fkey" FOREIGN KEY ("bateriaId") REFERENCES "baterias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ediciones" ADD CONSTRAINT "ediciones_bateriaId_fkey" FOREIGN KEY ("bateriaId") REFERENCES "baterias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ritmistas_edicion" ADD CONSTRAINT "ritmistas_edicion_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "ediciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ritmistas_edicion" ADD CONSTRAINT "ritmistas_edicion_ritmistaId_fkey" FOREIGN KEY ("ritmistaId") REFERENCES "ritmistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_cuenta_corriente" ADD CONSTRAINT "movimientos_cuenta_corriente_ritmistaEdicionId_fkey" FOREIGN KEY ("ritmistaEdicionId") REFERENCES "ritmistas_edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_indumentaria" ADD CONSTRAINT "entregas_indumentaria_ritmistaEdicionId_fkey" FOREIGN KEY ("ritmistaEdicionId") REFERENCES "ritmistas_edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficios_movimientos" ADD CONSTRAINT "beneficios_movimientos_ritmistaEdicionId_fkey" FOREIGN KEY ("ritmistaEdicionId") REFERENCES "ritmistas_edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_indumentaria" ADD CONSTRAINT "stock_indumentaria_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "ediciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rifas" ADD CONSTRAINT "rifas_ritmistaEdicionId_fkey" FOREIGN KEY ("ritmistaEdicionId") REFERENCES "ritmistas_edicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_movimientos" ADD CONSTRAINT "caja_movimientos_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "ediciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_eventos" ADD CONSTRAINT "agenda_eventos_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "ediciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
