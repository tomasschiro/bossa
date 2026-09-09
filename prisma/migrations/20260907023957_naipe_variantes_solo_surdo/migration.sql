-- Corrección del seed anterior: Caixa y Repique no tienen un tamaño estándar entre
-- baterías, así que no deberían precargarse con variantes por defecto — el director las
-- carga él mismo si las necesita. Surdo sí es una estructura estándar (1ra/2da/3ra) y
-- mantiene su seed. Se eliminan las variantes de Caixa y Repique ya insertadas por la
-- migración anterior; las de Surdo quedan intactas.
DELETE FROM "naipe_variantes"
WHERE "naipeId" IN (SELECT "id" FROM "naipes" WHERE "nombre" ~* '^caixas?$')
  AND "nombre" IN ('12"', '14"');

DELETE FROM "naipe_variantes"
WHERE "naipeId" IN (SELECT "id" FROM "naipes" WHERE "nombre" ~* '^repiques?$')
  AND "nombre" IN ('10"', '12"');
