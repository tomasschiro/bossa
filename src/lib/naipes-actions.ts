"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireBateria } from "./session";

export async function getNaipes() {
  const { bateriaId } = await requireBateria();
  return prisma.naipe.findMany({ where: { bateriaId }, orderBy: [{ orden: "asc" }, { id: "asc" }], include: { variantes: { orderBy: [{ orden: "asc" }, { id: "asc" }] } } });
}

export async function guardarNaipe(input: { id?: string; nombre: string }) {
  const { bateriaId, user } = await requireBateria();
  const nombre = typeof input.nombre === "string" ? input.nombre.trim().replace(/\s+/g, " ") : "";
  if (!nombre || nombre.length > 60 || nombre.toLowerCase() === "todos") return { error: "Ingresá un nombre de entre 1 y 60 caracteres, distinto de Todos." };
  const result = await prisma.$transaction(async (tx) => {
    // Serialize edits within this battery, including duplicate-name checks.
    await tx.$queryRaw`SELECT id FROM baterias WHERE id = ${bateriaId} FOR UPDATE`;
    const original = input.id ? await tx.naipe.findUniqueOrThrow({ where: { id: input.id, bateriaId } }) : null;
    const duplicate = await tx.naipe.findFirst({ where: { bateriaId, nombre: { equals: nombre, mode: "insensitive" }, ...(input.id ? { id: { not: input.id } } : {}) } });
    if (duplicate) return { error: "Ya existe un naipe con ese nombre en tu batería." };
    const last = await tx.naipe.aggregate({ where: { bateriaId }, _max: { orden: true } });
    const naipe = original
      ? await tx.naipe.update({ where: { id: original.id, bateriaId }, data: { nombre } })
      : await tx.naipe.create({ data: { bateriaId, nombre, orden: (last._max.orden ?? -1) + 1 } });
    if (original && original.nombre !== nombre) {
      await tx.ritmista.updateMany({ where: { bateriaId, naipeReferencia: original.nombre }, data: { naipeReferencia: nombre } });
    }
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: original ? "editarNaipe" : "crearNaipe", entidadId: naipe.id, datos: { anterior: original?.nombre ?? null, nombre } } });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}

export async function guardarVariante(input: { id?: string; naipeId: string; nombre: string }) {
  const { bateriaId, user } = await requireBateria();
  const nombre = typeof input.nombre === "string" ? input.nombre.trim().replace(/\s+/g, " ") : "";
  if (!nombre || nombre.length > 30) return { error: "Ingresá un nombre de variante de entre 1 y 30 caracteres." };
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM baterias WHERE id = ${bateriaId} FOR UPDATE`;
    const naipe = await tx.naipe.findUniqueOrThrow({ where: { id: input.naipeId, bateriaId } });
    const original = input.id ? await tx.naipeVariante.findUniqueOrThrow({ where: { id: input.id, naipeId: naipe.id } }) : null;
    const duplicate = await tx.naipeVariante.findFirst({ where: { naipeId: naipe.id, nombre: { equals: nombre, mode: "insensitive" }, ...(input.id ? { id: { not: input.id } } : {}) } });
    if (duplicate) return { error: "Ya existe una variante con ese nombre en este naipe." };
    const last = await tx.naipeVariante.aggregate({ where: { naipeId: naipe.id }, _max: { orden: true } });
    const variante = original
      ? await tx.naipeVariante.update({ where: { id: original.id }, data: { nombre } })
      : await tx.naipeVariante.create({ data: { naipeId: naipe.id, nombre, orden: (last._max.orden ?? -1) + 1 } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: original ? "editarVarianteNaipe" : "crearVarianteNaipe", entidadId: variante.id, datos: { naipe: naipe.nombre, anterior: original?.nombre ?? null, nombre } } });
    return { ok: true };
  });
  revalidatePath("/", "layout");
  return result;
}

export async function eliminarVariante(input: { id: string; naipeId: string }) {
  const { bateriaId, user } = await requireBateria();
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM baterias WHERE id = ${bateriaId} FOR UPDATE`;
    const naipe = await tx.naipe.findUniqueOrThrow({ where: { id: input.naipeId, bateriaId } });
    const variante = await tx.naipeVariante.findUniqueOrThrow({ where: { id: input.id, naipeId: naipe.id } });
    await tx.naipeVariante.delete({ where: { id: variante.id } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "eliminarVarianteNaipe", entidadId: variante.id, datos: { naipe: naipe.nombre, nombre: variante.nombre } } });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function moverNaipe(input: { id: string; direccion: "arriba" | "abajo" }) {
  const { bateriaId, user } = await requireBateria();
  if (!["arriba", "abajo"].includes(input.direccion)) throw new Error("Dirección inválida");
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM baterias WHERE id = ${bateriaId} FOR UPDATE`;
    const naipes = await tx.naipe.findMany({ where: { bateriaId }, orderBy: [{ orden: "asc" }, { id: "asc" }] });
    const index = naipes.findIndex((n) => n.id === input.id);
    if (index < 0) throw new Error("Naipe no disponible");
    const target = index + (input.direccion === "arriba" ? -1 : 1);
    if (target < 0 || target >= naipes.length) return;
    [naipes[index], naipes[target]] = [naipes[target], naipes[index]];
    for (const [orden, naipe] of naipes.entries()) await tx.naipe.update({ where: { id: naipe.id, bateriaId }, data: { orden } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "ordenarNaipes", entidadId: input.id, datos: { orden: naipes.map((n) => n.id) } } });
  });
  revalidatePath("/", "layout");
}
