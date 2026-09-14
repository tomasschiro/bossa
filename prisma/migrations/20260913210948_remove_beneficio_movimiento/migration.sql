-- Drop the disconnected "BeneficioMovimiento" system: it was never wired to
-- BeneficioDistribuidoTipo/Vendedor/Unidad/Venta (the real vendor-based system),
-- and beneficiosAsignados/beneficiosVendidos were hardcoded seed counters with
-- no actual computation behind them.

-- DropForeignKey
ALTER TABLE "beneficios_movimientos" DROP CONSTRAINT IF EXISTS "beneficios_movimientos_ritmistaEdicionId_fkey";

-- DropTable
DROP TABLE IF EXISTS "beneficios_movimientos";

-- DropEnum
DROP TYPE IF EXISTS "BeneficioEstado";

-- AlterTable
ALTER TABLE "ritmistas_edicion" DROP COLUMN IF EXISTS "beneficiosAsignados";
ALTER TABLE "ritmistas_edicion" DROP COLUMN IF EXISTS "beneficiosVendidos";
