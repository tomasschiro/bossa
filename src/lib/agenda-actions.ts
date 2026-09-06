"use server";
import { getCarnaval } from "./carnaval";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireBateria } from "./session";
import { AGENDA_TIPOS, fechaValida, hoyArgentina, recordatorios, type EventoTipo } from "./agenda-utils";
import type { EventoAgenda } from "./agenda-utils";
import type { AgendaEvento } from "@prisma/client";

function mapEvento(e: AgendaEvento): EventoAgenda { return { id: e.id, edicionId: e.edicionId, titulo: e.titulo, tipo: e.tipo, fecha: e.fecha.toISOString().slice(0, 10), hora: e.hora, lugar: e.lugar, descripcion: e.descripcion, recordarDiasAntes: e.recordarDiasAntes, cancelado: e.cancelado, registradoPor: e.registradoPor, actualizadoPor: e.actualizadoPor }; }
function eventosNoches(e: { id: string; noches: string[] }): EventoAgenda[] {
  return e.noches.map((fecha, i) => ({ id: `noche-${e.id}-${fecha}`, edicionId: e.id, titulo: i === e.noches.length - 1 ? "Última noche de Carnaval · Cierre" : `Noche ${i + 1} de Carnaval`, tipo: "presentacion", fecha, hora: null, lugar: null, descripcion: "Fecha definida en Configuración de Carnaval.", recordarDiasAntes: 7, cancelado: false, registradoPor: null, actualizadoPor: null, nocheCarnaval: true }));
}
export async function getAgenda(edicionId?: string) {
  const { bateriaId } = await requireBateria();
  const ciclo = await getCarnaval();
  const ediciones = ciclo.ediciones.map((e) => ({ ...e, activa: e.abierta }));
  const edicion = edicionId ? ediciones.find((e) => e.id === edicionId) : ediciones.find((e) => e.id === ciclo.actual?.id);
  if (edicionId && !edicion) throw new Error("Edición no disponible");
  const [eventos, ritmistas] = await Promise.all([
    edicion ? prisma.agendaEvento.findMany({ where: { edicionId: edicion.id, edicion: { bateriaId } }, orderBy: [{ fecha: "asc" }, { hora: "asc" }] }) : Promise.resolve([]),
    prisma.ritmista.findMany({ where: { bateriaId }, select: { id: true, nombre: true, apellido: true, fechaNacimiento: true }, orderBy: { nombre: "asc" } }),
  ]);
  return { ediciones, edicion: edicion ?? null, eventos: [...eventos.map(mapEvento), ...(edicion ? eventosNoches(edicion) : [])], ritmistas: ritmistas.map((r) => ({ id: r.id, nombre: `${r.nombre} ${r.apellido}`, nacimiento: r.fechaNacimiento.toISOString().slice(0, 10) })), hoy: hoyArgentina() };
}
export async function getAlertasAgenda() {
  const { bateriaId } = await requireBateria();
  const hoy = hoyArgentina();
  const hasta = new Date(hoy + "T00:00:00Z"); hasta.setUTCDate(hasta.getUTCDate() + 30);
  const [eventos, ritmistas] = await Promise.all([
    prisma.agendaEvento.findMany({ where: { edicion: { bateriaId, activa: true }, cancelado: false, fecha: { gte: new Date(hoy + "T00:00:00Z"), lte: hasta } } }),
    prisma.ritmista.findMany({ where: { bateriaId }, select: { id: true, nombre: true, apellido: true, fechaNacimiento: true } }),
  ]);
  const ciclo = await getCarnaval();
  return recordatorios([...eventos.map(mapEvento), ...ciclo.ediciones.filter((e) => e.abierta).flatMap(eventosNoches)], ritmistas.map((r) => ({ id: r.id, nombre: `${r.nombre} ${r.apellido}`, nacimiento: r.fechaNacimiento.toISOString().slice(0, 10) })), hoy);
}
export async function guardarEvento(input: { id?: string; edicionId: string; titulo: string; tipo: EventoTipo; fecha: string; hora: string; lugar: string; descripcion: string; recordarDiasAntes: number }) {
  const { bateriaId, user } = await requireBateria();
  if (typeof input.titulo !== "string" || !input.titulo.trim() || input.titulo.trim().length > 120) return { error: "Ingresá un título de hasta 120 caracteres." };
  if (!Object.hasOwn(AGENDA_TIPOS, input.tipo) || typeof input.fecha !== "string" || !fechaValida(input.fecha)) return { error: "Revisá el tipo y la fecha del evento." };
  if (typeof input.hora !== "string" || (input.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.hora))) return { error: "Ingresá una hora válida." };
  if (typeof input.lugar !== "string" || input.lugar.length > 200 || typeof input.descripcion !== "string" || input.descripcion.length > 2000) return { error: "Lugar: hasta 200 caracteres. Descripción: hasta 2000." };
  if (![0, 1, 3, 7, 14, 30].includes(input.recordarDiasAntes)) return { error: "Elegí una anticipación válida." };
  await prisma.$transaction(async (tx) => {
    await tx.edicion.findUniqueOrThrow({ where: { id: input.edicionId, bateriaId, activa: true } });
    const anterior = input.id ? await tx.agendaEvento.findUniqueOrThrow({ where: { id: input.id, edicionId: input.edicionId, edicion: { bateriaId, activa: true } } }) : null;
    const data = { titulo: input.titulo.trim(), tipo: input.tipo, fecha: new Date(input.fecha + "T00:00:00Z"), hora: input.hora || null, lugar: input.lugar.trim() || null, descripcion: input.descripcion.trim() || null, recordarDiasAntes: input.recordarDiasAntes, actualizadoPor: user.name };
    const evento = anterior ? await tx.agendaEvento.update({ where: { id: anterior.id, edicion: { bateriaId, activa: true } }, data }) : await tx.agendaEvento.create({ data: { ...data, registradoPor: user.name, edicion: { connect: { id: input.edicionId, bateriaId, activa: true } } } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: anterior ? "editarEvento" : "crearEvento", entidadId: evento.id, datos: JSON.parse(JSON.stringify({ anterior, evento })) } });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function cancelarEvento(id: string) {
  const { bateriaId, user } = await requireBateria();
  await prisma.$transaction(async (tx) => {
    const anterior = await tx.agendaEvento.findUniqueOrThrow({ where: { id, edicion: { bateriaId, activa: true } } });
    await tx.agendaEvento.update({ where: { id, edicion: { bateriaId, activa: true } }, data: { cancelado: !anterior.cancelado, actualizadoPor: user.name } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: anterior.cancelado ? "restaurarEvento" : "cancelarEvento", entidadId: id, datos: { cancelado: !anterior.cancelado } } });
  });
  revalidatePath("/", "layout");
}
