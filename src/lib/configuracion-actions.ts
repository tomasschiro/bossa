"use server";
import { getCarnaval } from "./carnaval";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireBateria } from "./session";
import { colorValido, leerPaleta, type Paleta } from "./paleta";

export async function getConfiguracion() {
  const { bateria, user, membresias } = await requireBateria();
  return { carnaval: await getCarnaval(), bateria: { nombre: bateria.nombre, comparsa: bateria.comparsa ?? "", paleta: leerPaleta(bateria.paletaColores) }, user: { nombre: user.name, email: user.email }, membresias: membresias.map((m) => ({ id: m.id, bateria: m.bateria.nombre, rol: m.rol })) };
}
export async function guardarBateria(input: { nombre: string; comparsa: string }) {
  const { bateriaId, user } = await requireBateria();
  if (typeof input.nombre !== "string" || !input.nombre.trim() || input.nombre.trim().length > 100 || typeof input.comparsa !== "string" || input.comparsa.trim().length > 100) return { error: "Ingresá un nombre y una comparsa de hasta 100 caracteres. El nombre es obligatorio." };
  const data = { nombre: input.nombre.trim(), comparsa: input.comparsa.trim() || null };
  await prisma.$transaction(async (tx) => {
    const anterior = await tx.bateria.findUniqueOrThrow({ where: { id: bateriaId }, select: { nombre: true, comparsa: true } });
    await tx.bateria.update({ where: { id: bateriaId }, data });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "editarBateria", entidadId: bateriaId, datos: { anterior, nuevo: data } } });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function guardarPaleta(input: Paleta) {
  const { bateriaId, user } = await requireBateria();
  if (!input || !colorValido(input.principal) || !colorValido(input.principalOscuro) || !colorValido(input.acento)) return { error: "Usá colores válidos con formato #RRGGBB." };
  const paleta = leerPaleta(input);
  await prisma.$transaction(async (tx) => {
    const anterior = await tx.bateria.findUniqueOrThrow({ where: { id: bateriaId }, select: { paletaColores: true } });
    await tx.bateria.update({ where: { id: bateriaId }, data: { paletaColores: paleta } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "editarPaleta", entidadId: bateriaId, datos: { anterior: anterior.paletaColores, nuevo: paleta } } });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function guardarNombreUsuario(nombre: string) {
  const { bateriaId, user } = await requireBateria();
  if (typeof nombre !== "string" || !nombre.trim() || nombre.trim().length > 100) return { error: "Ingresá tu nombre, de hasta 100 caracteres." };
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: user.id }, data: { nombre: nombre.trim() } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "editarNombreUsuario", entidadId: user.id, datos: { anterior: user.name, nuevo: nombre.trim() } } });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
