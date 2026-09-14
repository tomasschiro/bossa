-- Simplifica IndumentariaItem a solo Traje/Remera.
-- 1) "Remera oficial" se conserva como "Remera" (mismo estado/fecha/entregadoPor).
-- 2) Pantalón/Zapatillas/Medias/Gorra/Accesorio de naipe se eliminan.
-- 3) Se crea una fila "Traje" en Pendiente para cada RitmistaEdicion que no la tenga.

-- Tipo temporal con los valores nuevos + el viejo que vamos a preservar, para poder
-- castear la columna antes de tocar el enum original.
CREATE TYPE "IndumentariaItem_new" AS ENUM ('Traje', 'Remera');

ALTER TABLE "entregas_indumentaria"
  ALTER COLUMN "item" TYPE TEXT USING (
    CASE "item"::text
      WHEN 'Remera oficial' THEN 'Remera'
      ELSE "item"::text
    END
  );

-- Elimina las filas de items que ya no existen en el checklist.
DELETE FROM "entregas_indumentaria" WHERE "item" NOT IN ('Traje', 'Remera');

ALTER TABLE "entregas_indumentaria"
  ALTER COLUMN "item" TYPE "IndumentariaItem_new" USING ("item"::"IndumentariaItem_new");

DROP TYPE "IndumentariaItem";
ALTER TYPE "IndumentariaItem_new" RENAME TO "IndumentariaItem";
