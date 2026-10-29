"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireBateria } from "./session";
import { getCarnaval } from "./carnaval";
import { crearRitmistaEnEdicion, variantesDni } from "./ritmista-alta";

export type EstadoInscripcion = "Pendiente" | "Aprobada" | "Rechazada";

export interface InscripcionItem {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  nacimientoIso: string;
  naipe: string;
  talleRemera: string;
  calzado: string;
  telefonoTutor: string;
  fotoId: string | null;
  estado: EstadoInscripcion;
  revisadoPor: string | null;
  revisadoAtIso: string | null;
  createdAtIso: string;
}

const revalidar = () => {
  revalidatePath("/ritmistas/carnaval/inscripciones");
  revalidatePath("/ritmistas/carnaval");
  revalidatePath("/ritmistas/base-de-datos");
};

export async function getInscripciones(): Promise<InscripcionItem[]> {
  const { bateriaId } = await requireBateria();
  const rows = await prisma.inscripcion.findMany({
    where: { bateriaId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 500,
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    apellido: r.apellido,
    dni: r.dni,
    telefono: r.telefono,
    email: r.email ?? "",
    nacimientoIso: r.fechaNacimiento.toISOString().slice(0, 10),
    naipe: r.naipe,
    talleRemera: r.talleRemera,
    calzado: r.calzado,
    telefonoTutor: r.telefonoTutor ?? "",
    fotoId: r.fotoId,
    estado: r.estado,
    revisadoPor: r.revisadoPor,
    revisadoAtIso: r.revisadoAt?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

export async function contarInscripcionesPendientes(): Promise<number> {
  const { bateriaId } = await requireBateria();
  return prisma.inscripcion.count({ where: { bateriaId, estado: "Pendiente" } });
}

type Resultado = { ok: true } | { error: string };

export async function aprobarInscripcion(input: { id: string; nivel: "Principiante" | "Avanzado" }): Promise<Resultado> {
  const { bateriaId, user } = await requireBateria();
  if (input.nivel !== "Principiante" && input.nivel !== "Avanzado") return { error: "Asigná un nivel antes de aprobar." };
  // Misma edición con la que trabaja la pantalla de Ritmistas: la abierta o, si no hay, la preparada.
  const { actual, preparada } = await getCarnaval();
  const destino = actual ?? preparada;
  if (!destino) return { error: "Primero prepará el próximo Carnaval en Configuración." };

  const resultado = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM baterias WHERE id = ${bateriaId} FOR UPDATE`;
    const ins = await tx.inscripcion.findFirst({ where: { id: input.id, bateriaId } });
    if (!ins) return { error: "No encontramos esa inscripción." };
    if (ins.estado !== "Pendiente") return { error: "Esta inscripción ya fue revisada." };
    // Pudo haberse cargado a mano mientras la ficha esperaba revisión.
    const yaEsta = await tx.ritmista.count({ where: { bateriaId, dni: { in: variantesDni(ins.dni) } } });
    if (yaEsta > 0) return { error: "Ya hay un ritmista con este DNI en el padrón." };

    const ritmista = await crearRitmistaEnEdicion(tx, bateriaId, destino, {
      nombre: ins.nombre,
      apellido: ins.apellido,
      dni: ins.dni,
      telefono: ins.telefono,
      nacimientoIso: ins.fechaNacimiento.toISOString().slice(0, 10),
      naipeReferencia: ins.naipe,
      talleRemera: ins.talleRemera,
      calzado: ins.calzado,
      nivel: input.nivel,
      email: ins.email,
      telefonoTutor: ins.telefonoTutor,
      fotoId: ins.fotoId,
    });
    await tx.inscripcion.update({
      where: { id: ins.id },
      data: { estado: "Aprobada", ritmistaId: ritmista.id, revisadoPorId: user.id, revisadoPor: user.name, revisadoAt: new Date() },
    });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "aprobarInscripcion", entidadId: ins.id, datos: { ritmistaId: ritmista.id, nivel: input.nivel, edicionId: destino.id } },
    });
    return { ok: true as const };
  });

  if ("ok" in resultado) revalidar();
  return resultado;
}

export async function rechazarInscripcion(input: { id: string }): Promise<Resultado> {
  const { bateriaId, user } = await requireBateria();
  const resultado = await prisma.$transaction(async (tx) => {
    // Mismo bloqueo que aprobar: si dos directores la revisan a la vez, solo gana uno.
    await tx.$queryRaw`SELECT id FROM baterias WHERE id = ${bateriaId} FOR UPDATE`;
    const ins = await tx.inscripcion.findFirst({ where: { id: input.id, bateriaId } });
    if (!ins) return { error: "No encontramos esa inscripción." };
    if (ins.estado !== "Pendiente") return { error: "Esta inscripción ya fue revisada." };
    await tx.inscripcion.update({
      where: { id: ins.id },
      data: { estado: "Rechazada", revisadoPorId: user.id, revisadoPor: user.name, revisadoAt: new Date() },
    });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "rechazarInscripcion", entidadId: ins.id, datos: {} },
    });
    return { ok: true as const };
  });

  if ("ok" in resultado) revalidar();
  return resultado;
}
