"use server";
import { getCarnaval } from "./carnaval";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { prisma } from "./prisma";
import { requireBateria } from "./session";
import { colorValido, leerPaleta, type Paleta } from "./paleta";

const LOGO_TIPOS_VALIDOS = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const LOGO_TAMANO_MAXIMO = 2 * 1024 * 1024;

export async function getConfiguracion() {
  const { bateria, user, membresias } = await requireBateria();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: user.id }, select: { esSuperAdmin: true } });
  return {
    carnaval: await getCarnaval(),
    bateria: { nombre: bateria.nombre, comparsa: bateria.comparsa ?? "", paleta: leerPaleta(bateria.paletaColores), logoUrl: bateria.logoUrl },
    user: { nombre: user.name, email: user.email, esSuperAdmin: usuario.esSuperAdmin },
    membresias: membresias.map((m) => ({ id: m.id, bateria: m.bateria.nombre, rol: m.rol })),
  };
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
export async function subirLogo(formData: FormData): Promise<{ ok: true; logoUrl: string } | { error: string }> {
  const { bateriaId, user } = await requireBateria();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí un archivo de imagen." };
  if (!LOGO_TIPOS_VALIDOS.includes(file.type)) return { error: "Usá una imagen PNG, JPG, SVG o WebP." };
  if (file.size > LOGO_TAMANO_MAXIMO) return { error: "La imagen debe pesar hasta 2 MB." };

  const anterior = await prisma.bateria.findUniqueOrThrow({ where: { id: bateriaId }, select: { logoUrl: true } });
  const ext = file.name.split(".").pop() || "png";
  // Subida al blob storage fuera de la transacción de Prisma: es I/O de red externo,
  // no debe mantener una transacción de DB abierta mientras dura.
  const blob = await put(`logos/${bateriaId}-${Date.now()}.${ext}`, file, { access: "public", token: process.env.BLOB_READ_WRITE_TOKEN });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bateria.update({ where: { id: bateriaId }, data: { logoUrl: blob.url } });
      await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "editarLogo", entidadId: bateriaId, datos: { anterior: anterior.logoUrl, nuevo: blob.url } } });
    });
  } catch (e) {
    await del(blob.url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
    throw e;
  }

  if (anterior.logoUrl) await del(anterior.logoUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
  revalidatePath("/", "layout");
  return { ok: true, logoUrl: blob.url };
}

export async function quitarLogo(): Promise<{ ok: true } | { error: string }> {
  const { bateriaId, user } = await requireBateria();
  const anterior = await prisma.bateria.findUniqueOrThrow({ where: { id: bateriaId }, select: { logoUrl: true } });
  if (!anterior.logoUrl) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.bateria.update({ where: { id: bateriaId }, data: { logoUrl: null } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "quitarLogo", entidadId: bateriaId, datos: { anterior: anterior.logoUrl } } });
  });
  await del(anterior.logoUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
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
