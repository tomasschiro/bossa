-- AlterTable: agregar columnas nullable primero (por si hay filas existentes)
ALTER TABLE "beneficio_gastos" ADD COLUMN     "cantidad" INTEGER,
ADD COLUMN     "costoUnidad" DECIMAL(12,2);

ALTER TABLE "presupuesto_gastos" ADD COLUMN     "cantidad" INTEGER,
ADD COLUMN     "costoUnidad" DECIMAL(12,2);

-- Backfill: cantidad=1, costoUnidad=monto actual (el subtotal no cambia para filas existentes)
UPDATE "beneficio_gastos" SET "cantidad" = 1, "costoUnidad" = "monto" WHERE "cantidad" IS NULL;
UPDATE "presupuesto_gastos" SET "cantidad" = 1, "costoUnidad" = "monto" WHERE "cantidad" IS NULL;

-- AlterTable: ahora sí, requerir NOT NULL
ALTER TABLE "beneficio_gastos" ALTER COLUMN "cantidad" SET NOT NULL,
ALTER COLUMN "costoUnidad" SET NOT NULL;

ALTER TABLE "presupuesto_gastos" ALTER COLUMN "cantidad" SET NOT NULL,
ALTER COLUMN "costoUnidad" SET NOT NULL;
