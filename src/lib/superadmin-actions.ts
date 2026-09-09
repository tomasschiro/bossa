"use server";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "./prisma";
import { requireSuperAdmin } from "./session";
import type { RolMembresia } from "@prisma/client";

const ROLES_VALIDOS: RolMembresia[] = ["director", "admin"];

export async function getBaterias() {
  await requireSuperAdmin();
  const baterias = await prisma.bateria.findMany({
    select: { id: true, nombre: true, comparsa: true, _count: { select: { membresias: true } } },
    orderBy: { nombre: "asc" },
  });
  return baterias.map((b) => ({ id: b.id, nombre: b.nombre, comparsa: b.comparsa, cantidadUsuarios: b._count.membresias }));
}

export async function getBateriaDetalle(bateriaId: string) {
  await requireSuperAdmin();
  const bateria = await prisma.bateria.findUnique({
    where: { id: bateriaId },
    select: {
      id: true,
      nombre: true,
      comparsa: true,
      membresias: { include: { usuario: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!bateria) return null;
  return {
    id: bateria.id,
    nombre: bateria.nombre,
    comparsa: bateria.comparsa,
    usuarios: bateria.membresias.map((m) => ({ membresiaId: m.id, usuarioId: m.usuario.id, nombre: m.usuario.nombre, email: m.usuario.email, rol: m.rol })),
  };
}

export async function getUsuariosGlobal() {
  await requireSuperAdmin();
  const usuarios = await prisma.usuario.findMany({
    include: { membresias: { include: { bateria: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  return usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    esSuperAdmin: u.esSuperAdmin,
    membresias: u.membresias.map((m) => ({ id: m.id, bateriaId: m.bateriaId, bateria: m.bateria.nombre, rol: m.rol })),
  }));
}

export async function crearBateriaConDirector(input: {
  nombre: string;
  comparsa: string;
  directorNombre: string;
  directorEmail: string;
  directorPassword: string;
}): Promise<{ ok: true; bateriaId: string } | { error: string }> {
  const { user } = await requireSuperAdmin();
  const nombre = input.nombre.trim();
  const comparsa = input.comparsa.trim();
  const directorNombre = input.directorNombre.trim();
  const directorEmail = input.directorEmail.trim().toLowerCase();
  if (!nombre || nombre.length > 100) return { error: "Ingresá un nombre de batería de hasta 100 caracteres." };
  if (comparsa.length > 100) return { error: "La comparsa puede tener hasta 100 caracteres." };
  if (!directorNombre || directorNombre.length > 100) return { error: "Ingresá el nombre del director, hasta 100 caracteres." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(directorEmail)) return { error: "Ingresá un email válido para el director." };
  if (input.directorPassword.length < 8 || input.directorPassword.length > 128) return { error: "La contraseña debe tener entre 8 y 128 caracteres." };

  const existente = await prisma.usuario.findUnique({ where: { email: directorEmail } });
  if (existente) return { error: "Ya existe un usuario con ese email." };

  const bateriaId = await prisma.$transaction(async (tx) => {
    const bateria = await tx.bateria.create({ data: { nombre, comparsa: comparsa || null } });
    const director = await tx.usuario.create({ data: { nombre: directorNombre, email: directorEmail } });
    await tx.account.create({
      data: { issuer: "local:credential", providerId: "credential", accountId: director.id, userId: director.id, password: await hashPassword(input.directorPassword) },
    });
    await tx.membresia.create({ data: { usuarioId: director.id, bateriaId: bateria.id, rol: "director" } });
    await tx.auditoria.create({
      data: { bateriaId: bateria.id, usuarioId: user.id, registradoPor: user.name, accion: "crearBateria", entidadId: bateria.id, datos: { nombre, comparsa, directorEmail } },
    });
    return bateria.id;
  });
  revalidatePath("/superadmin/baterias");
  return { ok: true, bateriaId };
}

export async function guardarBateriaSuperAdmin(input: { bateriaId: string; nombre: string; comparsa: string }): Promise<{ ok: true } | { error: string }> {
  const { user } = await requireSuperAdmin();
  const nombre = input.nombre.trim();
  const comparsa = input.comparsa.trim();
  if (!nombre || nombre.length > 100) return { error: "Ingresá un nombre de hasta 100 caracteres." };
  if (comparsa.length > 100) return { error: "La comparsa puede tener hasta 100 caracteres." };

  await prisma.$transaction(async (tx) => {
    const anterior = await tx.bateria.findUniqueOrThrow({ where: { id: input.bateriaId }, select: { nombre: true, comparsa: true } });
    await tx.bateria.update({ where: { id: input.bateriaId }, data: { nombre, comparsa: comparsa || null } });
    await tx.auditoria.create({
      data: { bateriaId: input.bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "editarBateria", entidadId: input.bateriaId, datos: { anterior, nuevo: { nombre, comparsa } } },
    });
  });
  revalidatePath(`/superadmin/baterias/${input.bateriaId}`);
  revalidatePath("/superadmin/baterias");
  return { ok: true };
}

export async function crearUsuarioConMembresia(input: {
  nombre: string;
  email: string;
  password: string;
  bateriaId: string;
  rol: RolMembresia;
}): Promise<{ ok: true } | { error: string }> {
  const { user } = await requireSuperAdmin();
  const nombre = input.nombre.trim();
  const email = input.email.trim().toLowerCase();
  if (!nombre || nombre.length > 100) return { error: "Ingresá un nombre de hasta 100 caracteres." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Ingresá un email válido." };
  if (input.password.length < 8 || input.password.length > 128) return { error: "La contraseña debe tener entre 8 y 128 caracteres." };
  if (!ROLES_VALIDOS.includes(input.rol)) return { error: "Elegí un rol válido." };

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return { error: "Ya existe un usuario con ese email." };
  const bateria = await prisma.bateria.findUnique({ where: { id: input.bateriaId } });
  if (!bateria) return { error: "La batería elegida no existe." };

  // El signup público está deshabilitado (better-auth: disableSignUp) a propósito;
  // acá replicamos a mano lo que hace prisma/seed.ts para crear un usuario con credenciales.
  await prisma.$transaction(async (tx) => {
    const nuevo = await tx.usuario.create({ data: { nombre, email } });
    await tx.account.create({
      data: {
        issuer: "local:credential",
        providerId: "credential",
        accountId: nuevo.id,
        userId: nuevo.id,
        password: await hashPassword(input.password),
      },
    });
    await tx.membresia.create({ data: { usuarioId: nuevo.id, bateriaId: input.bateriaId, rol: input.rol } });
    await tx.auditoria.create({
      data: { bateriaId: input.bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "crearUsuario", entidadId: nuevo.id, datos: { email, rol: input.rol } },
    });
  });
  revalidatePath(`/superadmin/baterias/${input.bateriaId}`);
  revalidatePath("/superadmin/usuarios");
  return { ok: true };
}

export async function editarUsuarioSuperAdmin(input: {
  usuarioId: string;
  nombre: string;
  email: string;
}): Promise<{ ok: true } | { error: string }> {
  const { user } = await requireSuperAdmin();
  const nombre = input.nombre.trim();
  const email = input.email.trim().toLowerCase();
  if (!nombre || nombre.length > 100) return { error: "Ingresá un nombre de hasta 100 caracteres." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Ingresá un email válido." };

  const actual = await prisma.usuario.findUnique({ where: { id: input.usuarioId }, select: { nombre: true, email: true } });
  if (!actual) return { error: "El usuario no existe." };
  if (email !== actual.email) {
    const ocupado = await prisma.usuario.findUnique({ where: { email } });
    if (ocupado) return { error: "Ya existe un usuario con ese email." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: input.usuarioId }, data: { nombre, email } });
    await tx.auditoria.create({
      data: { usuarioId: user.id, registradoPor: user.name, accion: "editarUsuario", entidadId: input.usuarioId, datos: { anterior: actual, nuevo: { nombre, email } } },
    });
  });
  revalidatePath("/superadmin", "layout");
  return { ok: true };
}

export async function resetPasswordUsuarioSuperAdmin(input: {
  usuarioId: string;
  password: string;
}): Promise<{ ok: true } | { error: string }> {
  const { user } = await requireSuperAdmin();
  if (input.password.length < 8 || input.password.length > 128) return { error: "La contraseña debe tener entre 8 y 128 caracteres." };

  const cuenta = await prisma.account.findFirst({ where: { userId: input.usuarioId, providerId: "credential" } });
  if (!cuenta) return { error: "El usuario no tiene credenciales para cambiar." };

  await prisma.$transaction(async (tx) => {
    await tx.account.update({ where: { id: cuenta.id }, data: { password: await hashPassword(input.password) } });
    await tx.auditoria.create({
      data: { usuarioId: user.id, registradoPor: user.name, accion: "resetPasswordUsuario", entidadId: input.usuarioId, datos: {} },
    });
  });
  revalidatePath("/superadmin", "layout");
  return { ok: true };
}

export async function cambiarRolMembresia(input: { membresiaId: string; rol: RolMembresia }): Promise<{ ok: true } | { error: string }> {
  const { user } = await requireSuperAdmin();
  if (!ROLES_VALIDOS.includes(input.rol)) return { error: "Elegí un rol válido." };
  await prisma.$transaction(async (tx) => {
    const membresia = await tx.membresia.findUniqueOrThrow({ where: { id: input.membresiaId } });
    await tx.membresia.update({ where: { id: input.membresiaId }, data: { rol: input.rol } });
    await tx.auditoria.create({
      data: { bateriaId: membresia.bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "editarRolMembresia", entidadId: input.membresiaId, datos: { anterior: membresia.rol, nuevo: input.rol } },
    });
  });
  revalidatePath("/superadmin", "layout");
  return { ok: true };
}

export async function quitarAcceso(input: { membresiaId: string }): Promise<{ ok: true } | { error: string }> {
  const { user } = await requireSuperAdmin();
  await prisma.$transaction(async (tx) => {
    const membresia = await tx.membresia.findUniqueOrThrow({ where: { id: input.membresiaId } });
    await tx.membresia.delete({ where: { id: input.membresiaId } });
    await tx.auditoria.create({
      data: { bateriaId: membresia.bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "quitarAcceso", entidadId: input.membresiaId, datos: { membresiaEliminada: membresia } },
    });
  });
  revalidatePath("/superadmin", "layout");
  return { ok: true };
}
