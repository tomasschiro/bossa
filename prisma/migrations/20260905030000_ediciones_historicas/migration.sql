-- Las ediciones heredadas anteriores a la preparación 2027 pasan a consulta.
-- No se modifican participantes, movimientos ni fechas.
UPDATE "ediciones" SET "activa" = false WHERE "anioCarnaval" <= 2026 AND "ultimaNoche" IS NULL;
