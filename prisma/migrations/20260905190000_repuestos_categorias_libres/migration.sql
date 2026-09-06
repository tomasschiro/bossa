ALTER TABLE "repuestos" ALTER COLUMN "categoria" DROP DEFAULT;
ALTER TABLE "repuestos" ALTER COLUMN "categoria" TYPE TEXT USING "categoria"::text;
DROP TYPE "CategoriaRepuesto";
