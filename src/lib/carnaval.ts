import { cache } from "react";
import { prisma } from "./prisma";
import { requireBateria } from "./session";
import { anioEnPreparacion } from "./carnaval-utils";
export const getCarnaval = cache(async () => {
  const { bateriaId } = await requireBateria();
  const rows = await prisma.edicion.findMany({ where: { bateriaId }, orderBy: { anioCarnaval: "asc" } });
  const ediciones = rows.map((e) => ({ id: e.id, anioCarnaval: e.anioCarnaval, abierta: e.activa, noches: Array.isArray(e.nochesCarnaval) ? e.nochesCarnaval.filter((n): n is string => typeof n === "string") : [], ultimaNoche: e.ultimaNoche?.toISOString().slice(0, 10) ?? null }));
  const actual = ediciones.find((e) => e.abierta) ?? null;
  const preparada = ediciones.find((e) => !e.abierta && (!actual || e.anioCarnaval > actual.anioCarnaval)) ?? null;
  return { ediciones, actual, preparada, proximoAnio: Math.max(anioEnPreparacion(), ...ediciones.map((e) => e.anioCarnaval + 1)) };
});
