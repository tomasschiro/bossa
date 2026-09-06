"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { mapRitmista, mapRitmistaEdicion, ESTADO_UI_TO_DB } from "./mappers";
import type { Ritmista, RitmistaEdicion, EstadoLlegada, MovimientoTipo, MovimientoEstado, BeneficioEstado } from "./types";
import { getCarnaval } from "./carnaval";

import { requireBateria } from "./session";

const editionScope = (bateriaId: string) => ({ edicion: { bateriaId }, ritmista: { bateriaId } });

const writableScope = (bateriaId: string) => ({ edicion: { bateriaId, activa: true }, ritmista: { bateriaId } });
async function getEdicion(edicionId?: string) {
  const { bateriaId } = await requireBateria();
  if (edicionId !== undefined) return prisma.edicion.findFirst({ where: { bateriaId, id: edicionId } });
  const { actual } = await getCarnaval();
  return actual;
}

/** Padrón histórico completo (Base de Datos) */
export async function getRitmistasPadron(): Promise<Ritmista[]> {
  const { bateriaId } = await requireBateria();
  const rows = await prisma.ritmista.findMany({
    where: { bateriaId },
    include: { historial: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapRitmista);
}

export async function getRitmista(id: string): Promise<Ritmista | null> {
  const { bateriaId } = await requireBateria();
  const row = await prisma.ritmista.findUnique({
    where: { id, bateriaId },
    include: { historial: true },
  });
  return row ? mapRitmista(row) : null;
}

/** Ritmistas + su entrada en una edición de Carnaval (activa por defecto) */
export async function getRitmistasEdicion(
  edicionId?: string,
): Promise<{ ritmista: Ritmista; edicion: RitmistaEdicion }[]> {
  const { bateriaId } = await requireBateria();
  const edicion = await getEdicion(edicionId);
  if (!edicion) return [];
  const rows = await prisma.ritmistaEdicion.findMany({
    where: { edicionId: edicion.id, ...editionScope(bateriaId) },
    include: {
      ritmista: { include: { historial: true } },
      movimientos: { orderBy: { fecha: "asc" } },
      entregas: true,
      beneficios: { orderBy: { fecha: "asc" } },
    },
    orderBy: { id: "asc" },
  });
  return rows.map((re) => ({
    ritmista: mapRitmista(re.ritmista),
    edicion: { ...mapRitmistaEdicion(re), edicionAnio: edicion.anioCarnaval },
  }));
}

export async function getRitmistaEdicionById(
  id: string,
): Promise<{ ritmista: Ritmista; edicion: RitmistaEdicion } | null> {
  const { bateriaId } = await requireBateria();
  const re = await prisma.ritmistaEdicion.findUnique({
    where: { id, ...editionScope(bateriaId) },
    include: {
      ritmista: { include: { historial: true } },
      movimientos: { orderBy: { fecha: "asc" } },
      entregas: true,
      beneficios: { orderBy: { fecha: "asc" } },
    },
  });
  if (!re) return null;
  const edicionRow = await prisma.edicion.findUnique({ where: { id: re.edicionId, bateriaId } });
  return {
    ritmista: mapRitmista(re.ritmista),
    edicion: { ...mapRitmistaEdicion(re), edicionAnio: edicionRow!.anioCarnaval },
  };
}

interface CreateRitmistaInput {
  edicionId?: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  nacimientoIso: string;
  naipeReferencia: string;
  talleRemera: string;
  calzado: string;
}

/** Crea un ritmista en el padrón y lo suma a una edición (activa por defecto) como No confirmado */
export async function createRitmista(input: CreateRitmistaInput) {
  const { bateriaId } = await requireBateria();
  await prisma.naipe.findFirstOrThrow({ where: { bateriaId, nombre: input.naipeReferencia } });
  const destino = await getEdicion(input.edicionId);
  if (!destino) throw new Error("Primero prepará el próximo Carnaval en Configuración.");
  const edicionId = destino.id;

  const ritmista = await prisma.ritmista.create({
    data: {
      bateriaId,
      nombre: input.nombre,
      apellido: input.apellido,
      dni: input.dni,
      telefono: input.telefono,
      fechaNacimiento: new Date(input.nacimientoIso),
      naipeReferencia: input.naipeReferencia,
      talleRemera: input.talleRemera,
      calzado: input.calzado,
      historial: {
        create: [{ naipe: input.naipeReferencia, periodo: `${destino.anioCarnaval}`, desde: destino.anioCarnaval }],
      },
    },
  });

  const indumentariaItems = ["RemeraOficial", "Pantalon", "Zapatillas", "Medias", "Gorra", "AccesorioDeNaipe"] as const;

  await prisma.ritmistaEdicion.create({
    data: {
      edicionId,
      ritmistaId: ritmista.id,
      naipe: input.naipeReferencia,
      estadoLlegada: "NoConfirmado",
      entregas: {
        create: indumentariaItems.map((item) => ({ item, estado: "Pendiente" as const })),
      },
    },
  });

  revalidatePath("/ritmistas/carnaval");
  revalidatePath("/ritmistas/base-de-datos");
}

interface UpdateRitmistaInput {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  nacimientoIso: string;
  talleRemera: string;
  calzado: string;
  nivel: string;
}

export async function updateRitmista(input: UpdateRitmistaInput) {
  const { bateriaId } = await requireBateria();
  await prisma.ritmista.update({
    where: { id: input.id, bateriaId },
    data: {
      nombre: input.nombre,
      apellido: input.apellido,
      dni: input.dni,
      telefono: input.telefono,
      fechaNacimiento: new Date(input.nacimientoIso),
      talleRemera: input.talleRemera,
      calzado: input.calzado,
      nivel: input.nivel as "Principiante" | "Avanzado",
    },
  });
  revalidatePath("/ritmistas/carnaval");
  revalidatePath("/ritmistas/base-de-datos");
}

export async function updateRitmistaEdicion(input: {
  id: string;
  naipe: string;
  estadoLlegada: EstadoLlegada;
}) {
  const { bateriaId } = await requireBateria();
  await prisma.ritmistaEdicion.update({
    where: { id: input.id, ...writableScope(bateriaId) },
    data: {
      naipe: input.naipe,
      estadoLlegada: ESTADO_UI_TO_DB[input.estadoLlegada],
    },
  });
  revalidatePath("/ritmistas/carnaval");
}

export async function addMovimiento(input: {
  ritmistaEdicionId: string;
  tipo: MovimientoTipo;
  concepto: string;
  fechaIso: string;
  monto: number;
  estado: MovimientoEstado;
}) {
  const { user, bateriaId } = await requireBateria();
  await prisma.movimientoCuentaCorriente.create({
    data: {
      ritmistaEdicion: { connect: { id: input.ritmistaEdicionId, ...writableScope(bateriaId) } },
      tipo: input.tipo,
      concepto: input.concepto,
      fecha: new Date(input.fechaIso),
      monto: input.monto,
      estado: input.estado,
      registradoPor: user.name,
    },
  });
  revalidatePath("/ritmistas/carnaval");
}

export async function revertMovimiento(id: string) {
  const { user, bateriaId } = await requireBateria();
  await prisma.$transaction(async (tx) => {
    const original = await tx.movimientoCuentaCorriente.delete({ where: { id, ritmistaEdicion: writableScope(bateriaId) } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name,
      accion: "revertMovimiento", entidadId: id, datos: JSON.parse(JSON.stringify(original)),
    } });
  });
  revalidatePath("/ritmistas/carnaval");
}

export async function addBeneficio(input: {
  ritmistaEdicionId: string;
  concepto: string;
  fechaIso: string;
  monto: number;
  estado: BeneficioEstado;
}) {
  const { user, bateriaId } = await requireBateria();
  await prisma.beneficioMovimiento.create({
    data: {
      ritmistaEdicion: { connect: { id: input.ritmistaEdicionId, ...writableScope(bateriaId) } },
      concepto: input.concepto,
      fecha: new Date(input.fechaIso),
      monto: input.monto,
      estado: input.estado,
      registradoPor: user.name,
    },
  });
  revalidatePath("/ritmistas/carnaval");
}

export async function revertBeneficio(id: string) {
  const { user, bateriaId } = await requireBateria();
  await prisma.$transaction(async (tx) => {
    const original = await tx.beneficioMovimiento.delete({ where: { id, ritmistaEdicion: writableScope(bateriaId) } });
    await tx.auditoria.create({ data: { bateriaId, usuarioId: user.id, registradoPor: user.name,
      accion: "revertBeneficio", entidadId: id, datos: JSON.parse(JSON.stringify(original)),
    } });
  });
  revalidatePath("/ritmistas/carnaval");
}

export async function toggleEntrega(input: { id: string }) {
  const { user, bateriaId } = await requireBateria();
  const scope = { id: input.id, ritmistaEdicion: writableScope(bateriaId) };
  const entrega = await prisma.entregaIndumentaria.findUniqueOrThrow({ where: scope });
  const next = entrega.estado === "Entregado" ? "Pendiente" : "Entregado";
  await prisma.entregaIndumentaria.update({
    where: scope,
    data: {
      estado: next,
      fechaEntrega: next === "Entregado" ? new Date() : null,
      entregadoPor: next === "Entregado" ? user.name : null,
    },
  });
  revalidatePath("/ritmistas/carnaval");
}

export async function updateBeneficiosCounts(input: {
  id: string;
  beneficiosAsignados: number;
  beneficiosVendidos: number;
}) {
  const { bateriaId } = await requireBateria();
  await prisma.ritmistaEdicion.update({
    where: { id: input.id, ...writableScope(bateriaId) },
    data: {
      beneficiosAsignados: input.beneficiosAsignados,
      beneficiosVendidos: input.beneficiosVendidos,
    },
  });
  revalidatePath("/ritmistas/carnaval");
}
