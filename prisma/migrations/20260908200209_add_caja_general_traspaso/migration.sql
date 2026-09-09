-- AlterEnum
ALTER TYPE "CajaCategoria" ADD VALUE 'General';

-- AlterTable
ALTER TABLE "caja_movimientos" ADD COLUMN     "esTraspaso" BOOLEAN NOT NULL DEFAULT false;
