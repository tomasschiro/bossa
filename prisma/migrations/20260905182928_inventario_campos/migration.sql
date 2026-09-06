/*
  Warnings:

  - You are about to drop the column `codigo` on the `instrumentos` table. All the data in the column will be lost.
  - The `categoria` column on the `repuestos` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TipoCaixa" AS ENUM ('Vazada', 'Con cilindro');

-- CreateEnum
CREATE TYPE "CategoriaRepuesto" AS ENUM ('Cueros', 'Bordonas', 'Otro');

-- AlterTable
ALTER TABLE "agenda_eventos" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "instrumentos" DROP COLUMN "codigo",
ADD COLUMN     "cantidad" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "marca" TEXT,
ADD COLUMN     "pulgadas" DECIMAL(4,1),
ADD COLUMN     "tipoCaixa" "TipoCaixa";

-- AlterTable
ALTER TABLE "repuestos" ADD COLUMN     "cantidad" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "categoria",
ADD COLUMN     "categoria" "CategoriaRepuesto" NOT NULL DEFAULT 'Otro';
