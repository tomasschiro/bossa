-- CreateTable
CREATE TABLE "naipe_variantes" (
    "id" TEXT NOT NULL,
    "naipeId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "naipe_variantes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "naipe_variantes" ADD CONSTRAINT "naipe_variantes_naipeId_fkey" FOREIGN KEY ("naipeId") REFERENCES "naipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: precargar variantes por defecto para Caixa, Surdo y Repique (nombres en singular
-- o plural, cualquier batería existente). Tamborim, Chocalho, Frigideira y Cuica quedan
-- sin variantes predefinidas — el director las carga si las necesita.
INSERT INTO "naipe_variantes" ("id", "naipeId", "nombre", "orden")
SELECT gen_random_uuid()::text, n."id", v.nombre, v.orden
FROM "naipes" n
CROSS JOIN LATERAL (VALUES ('12"', 0), ('14"', 1)) AS v(nombre, orden)
WHERE n."nombre" ~* '^caixas?$';

INSERT INTO "naipe_variantes" ("id", "naipeId", "nombre", "orden")
SELECT gen_random_uuid()::text, n."id", v.nombre, v.orden
FROM "naipes" n
CROSS JOIN LATERAL (VALUES ('1ra', 0), ('2da', 1), ('3ra', 2)) AS v(nombre, orden)
WHERE n."nombre" ~* '^surdos?$';

INSERT INTO "naipe_variantes" ("id", "naipeId", "nombre", "orden")
SELECT gen_random_uuid()::text, n."id", v.nombre, v.orden
FROM "naipes" n
CROSS JOIN LATERAL (VALUES ('10"', 0), ('12"', 1)) AS v(nombre, orden)
WHERE n."nombre" ~* '^repiques?$';
