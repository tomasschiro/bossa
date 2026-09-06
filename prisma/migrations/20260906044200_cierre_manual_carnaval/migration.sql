-- El cierre de una edición pasa a ser una acción manual del director (cerrarCarnaval),
-- no algo derivado de las fechas cargadas. "activa" queda como único criterio.
-- Esta restricción garantiza a nivel de base que nunca haya dos ediciones activas
-- para la misma batería, incluso bajo escrituras concurrentes.
CREATE UNIQUE INDEX "ediciones_bateria_activa_unica" ON "ediciones" ("bateriaId") WHERE "activa" = true;
