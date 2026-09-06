"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import {
  mapInstrumento,
  mapRepuesto,
  INSTRUMENTO_ESTADO_UI_TO_DB,
  ETIQUETA_UI_TO_DB,
  TIPO_CAIXA_UI_TO_DB,
} from "./mappers";
import type {
  Instrumento,
  Repuesto,
  InstrumentoEstado,
  ItemEtiqueta,
  ItemPrioridad,
  TipoCaixa,
  CategoriaRepuesto,
} from "./types";
import { requireBateria } from "./session";

interface InstrumentoInput {
  tipo: string;
  marca?: string | null;
  pulgadas?: number | null;
  tipoCaixa?: TipoCaixa | null;
  estado: InstrumentoEstado;
  cantidad: number;
  etiqueta?: ItemEtiqueta | null;
  prioridad?: ItemPrioridad | null;
  costoEstimado?: number | null;
}

function normalizeInstrumentoData(input: InstrumentoInput) {
  const tipo = input.tipo.trim();
  if (!tipo) throw new Error("El tipo es obligatorio");
  const cantidad = Math.trunc(input.cantidad);
  if (!Number.isFinite(cantidad) || cantidad < 1) throw new Error("La cantidad debe ser un entero mayor o igual a 1");
  const etiqueta = input.etiqueta ?? null;
  const prioridad = etiqueta === "Necesidad" ? (input.prioridad ?? null) : null;
  const tipoCaixa = tipo === "Caixa" ? (input.tipoCaixa ?? null) : null;
  return {
    tipo,
    marca: input.marca?.trim() || null,
    pulgadas: input.pulgadas ?? null,
    tipoCaixa: tipoCaixa ? TIPO_CAIXA_UI_TO_DB[tipoCaixa] : null,
    estado: INSTRUMENTO_ESTADO_UI_TO_DB[input.estado],
    cantidad,
    etiqueta: etiqueta ? ETIQUETA_UI_TO_DB[etiqueta] : null,
    prioridad: prioridad ?? null,
    costoEstimado: input.costoEstimado ?? null,
  };
}

export async function getInstrumentos(): Promise<Instrumento[]> {
  const { bateriaId } = await requireBateria();
  const rows = await prisma.instrumento.findMany({
    where: { bateriaId },
    orderBy: [{ tipo: "asc" }, { id: "asc" }],
  });
  return rows.map(mapInstrumento);
}

export async function crearInstrumento(input: InstrumentoInput): Promise<Instrumento> {
  const { bateriaId, user } = await requireBateria();
  const data = normalizeInstrumentoData(input);
  const instrumento = await prisma.instrumento.create({ data: { bateriaId, ...data } });
  await prisma.auditoria.create({
    data: {
      bateriaId,
      usuarioId: user.id,
      registradoPor: user.name,
      accion: "crearInstrumento",
      entidadId: instrumento.id,
      datos: { ...data },
    },
  });
  revalidatePath("/", "layout");
  return mapInstrumento(instrumento);
}

export async function actualizarInstrumento(input: InstrumentoInput & { id: string }) {
  const { bateriaId, user } = await requireBateria();
  await prisma.instrumento.findUniqueOrThrow({ where: { id: input.id, bateriaId } });
  const data = normalizeInstrumentoData(input);
  const instrumento = await prisma.instrumento.update({ where: { id: input.id, bateriaId }, data });
  await prisma.auditoria.create({
    data: {
      bateriaId,
      usuarioId: user.id,
      registradoPor: user.name,
      accion: "actualizarInstrumento",
      entidadId: instrumento.id,
      datos: { ...data },
    },
  });
  revalidatePath("/", "layout");
}

export async function eliminarInstrumento(id: string) {
  const { bateriaId, user } = await requireBateria();
  const instrumento = await prisma.instrumento.findUnique({ where: { id, bateriaId } });
  if (!instrumento) return;
  await prisma.instrumento.deleteMany({ where: { id, bateriaId } });
  await prisma.auditoria.create({
    data: {
      bateriaId,
      usuarioId: user.id,
      registradoPor: user.name,
      accion: "eliminarInstrumento",
      entidadId: id,
      datos: { ...instrumento, pulgadas: instrumento.pulgadas ? Number(instrumento.pulgadas) : null, costoEstimado: instrumento.costoEstimado ? Number(instrumento.costoEstimado) : null },
    },
  });
  revalidatePath("/", "layout");
}

interface RepuestoInput {
  categoria: CategoriaRepuesto;
  descripcion: string;
  cantidad: number;
  etiqueta?: ItemEtiqueta | null;
  prioridad?: ItemPrioridad | null;
  costoEstimado?: number | null;
}

function normalizeRepuestoData(input: RepuestoInput) {
  const categoria = typeof input.categoria === "string" ? input.categoria.trim() : "";
  if (!categoria || categoria.length > 80) throw new Error("Ingresá una categoría de hasta 80 caracteres");
  const descripcion = input.descripcion.trim();
  if (!descripcion) throw new Error("La descripción es obligatoria");
  const cantidad = Math.trunc(input.cantidad);
  if (!Number.isFinite(cantidad) || cantidad < 1) throw new Error("La cantidad debe ser un entero mayor o igual a 1");
  const etiqueta = input.etiqueta ?? null;
  const prioridad = etiqueta === "Necesidad" ? (input.prioridad ?? null) : null;
  return {
    categoria,
    descripcion,
    cantidad,
    etiqueta: etiqueta ? ETIQUETA_UI_TO_DB[etiqueta] : null,
    prioridad: prioridad ?? null,
    costoEstimado: input.costoEstimado ?? null,
  };
}

export async function getRepuestos(): Promise<Repuesto[]> {
  const { bateriaId } = await requireBateria();
  const rows = await prisma.repuesto.findMany({
    where: { bateriaId },
    orderBy: [{ categoria: "asc" }, { id: "asc" }],
  });
  return rows.map(mapRepuesto);
}

export async function crearRepuesto(input: RepuestoInput): Promise<Repuesto> {
  const { bateriaId, user } = await requireBateria();
  const data = normalizeRepuestoData(input);
  const repuesto = await prisma.repuesto.create({ data: { bateriaId, ...data } });
  await prisma.auditoria.create({
    data: {
      bateriaId,
      usuarioId: user.id,
      registradoPor: user.name,
      accion: "crearRepuesto",
      entidadId: repuesto.id,
      datos: { ...data },
    },
  });
  revalidatePath("/", "layout");
  return mapRepuesto(repuesto);
}

export async function actualizarRepuesto(input: RepuestoInput & { id: string }) {
  const { bateriaId, user } = await requireBateria();
  await prisma.repuesto.findUniqueOrThrow({ where: { id: input.id, bateriaId } });
  const data = normalizeRepuestoData(input);
  const repuesto = await prisma.repuesto.update({ where: { id: input.id, bateriaId }, data });
  await prisma.auditoria.create({
    data: {
      bateriaId,
      usuarioId: user.id,
      registradoPor: user.name,
      accion: "actualizarRepuesto",
      entidadId: repuesto.id,
      datos: { ...data },
    },
  });
  revalidatePath("/", "layout");
}

export async function eliminarRepuesto(id: string) {
  const { bateriaId, user } = await requireBateria();
  const repuesto = await prisma.repuesto.findUnique({ where: { id, bateriaId } });
  if (!repuesto) return;
  await prisma.repuesto.deleteMany({ where: { id, bateriaId } });
  await prisma.auditoria.create({
    data: {
      bateriaId,
      usuarioId: user.id,
      registradoPor: user.name,
      accion: "eliminarRepuesto",
      entidadId: id,
      datos: { ...repuesto, costoEstimado: repuesto.costoEstimado ? Number(repuesto.costoEstimado) : null },
    },
  });
  revalidatePath("/", "layout");
}
