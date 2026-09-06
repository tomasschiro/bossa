"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireBateria } from "./session";
import { fechaValida } from "./agenda-utils";

/** Crea la próxima edición, sin fechas: se puede trabajar en paralelo mientras la activa sigue vigente. */
export async function prepararCarnaval(input: { anio: number; copiarRitmistas?: boolean }) {
  const { bateriaId, user } = await requireBateria();
  if (!Number.isInteger(input.anio) || input.anio < 2000 || input.anio > 2200) return { error: "Ingresá un año válido." };
  const edicion = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM baterias WHERE id = ${bateriaId} FOR UPDATE`;
    const existente = await tx.edicion.findUnique({ where: { bateriaId_anioCarnaval: { bateriaId, anioCarnaval: input.anio } } });
    if (existente) throw new Error("Ya existe una edición para ese año.");
    const todas = await tx.edicion.findMany({ where: { bateriaId }, orderBy: { anioCarnaval: "desc" } });
    const activa = todas.find((e) => e.activa);
    const preparada = todas.find((e) => !e.activa && (!activa || e.anioCarnaval > activa.anioCarnaval));
    if (preparada) throw new Error("Ya hay una edición preparada. Cerrá la activa antes de preparar otra.");
    if (input.anio <= (todas[0]?.anioCarnaval ?? 0)) throw new Error("La nueva edición debe ser posterior a la más reciente.");
    const nueva = await tx.edicion.create({ data: { bateriaId, anioCarnaval: input.anio, activa: false } });
    if (input.copiarRitmistas) {
      const anteriorEd = await tx.edicion.findFirst({ where: { bateriaId, anioCarnaval: { lt: input.anio } }, orderBy: { anioCarnaval: "desc" } });
      if (anteriorEd) {
        const activos = await tx.ritmistaEdicion.findMany({ where: { edicionId: anteriorEd.id, ritmista: { bateriaId } } });
        for (const r of activos) await tx.ritmistaEdicion.create({ data: { edicionId: nueva.id, ritmistaId: r.ritmistaId, naipe: r.naipe, entregas: { create: (["RemeraOficial", "Pantalon", "Zapatillas", "Medias", "Gorra", "AccesorioDeNaipe"] as const).map((item) => ({ item })) } } });
      }
    }
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "prepararCarnaval", entidadId: nueva.id, datos: { anio: input.anio, copiaRitmistas: Boolean(input.copiarRitmistas) } } });
    return nueva;
  }, { timeout: 20000 });
  revalidatePath("/", "layout");
  return { ok: true, edicionId: edicion.id };
}

/** Las noches son un dato informativo y opcional: no determinan el cierre. Editable en cualquier edición, activa o preparada. */
export async function guardarNoches(input: { edicionId: string; noches: string[] }) {
  const { bateriaId, user } = await requireBateria();
  if (!Array.isArray(input.noches) || input.noches.length > 40 || input.noches.some((n) => typeof n !== "string" || !fechaValida(n))) return { error: "Ingresá fechas válidas (hasta 40 noches)." };
  const noches = [...new Set(input.noches)].sort();
  if (noches.length !== input.noches.length) return { error: "Hay noches repetidas. Cada fecha debe aparecer una sola vez." };
  await prisma.$transaction(async (tx) => {
    await tx.edicion.findUniqueOrThrow({ where: { id: input.edicionId, bateriaId } });
    const data = { nochesCarnaval: noches, ultimaNoche: noches.length ? new Date(noches[noches.length - 1] + "T00:00:00Z") : null };
    await tx.edicion.update({ where: { id: input.edicionId, bateriaId }, data });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "editarNochesCarnaval", entidadId: input.edicionId, datos: { noches } } });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Cierre manual y explícito: la activa pasa a Historial, la preparada se activa. Único criterio de "activa" a partir de acá. */
export async function cerrarCarnaval(input: { edicionActualId: string; edicionSiguienteId: string }) {
  const { bateriaId, user } = await requireBateria();
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM baterias WHERE id = ${bateriaId} FOR UPDATE`;
    const actual = await tx.edicion.findUniqueOrThrow({ where: { id: input.edicionActualId, bateriaId, activa: true } });
    const siguiente = await tx.edicion.findUniqueOrThrow({ where: { id: input.edicionSiguienteId, bateriaId, activa: false } });
    if (siguiente.anioCarnaval <= actual.anioCarnaval) throw new Error("La próxima edición debe ser posterior a la activa.");
    await tx.edicion.update({ where: { id: actual.id, bateriaId }, data: { activa: false } });
    await tx.edicion.update({ where: { id: siguiente.id, bateriaId }, data: { activa: true } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "cerrarCarnaval", entidadId: siguiente.id, datos: { cerrada: actual.anioCarnaval, activada: siguiente.anioCarnaval } } });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
