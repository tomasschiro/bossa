-- AlterEnum
ALTER TYPE "RolMembresia" ADD VALUE 'admin';

-- AlterTable
ALTER TABLE "baterias" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "esSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
