"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { mapRitmista, mapRitmistaEdicion, ESTADO_UI_TO_DB } from "./mappers";
import type { Ritmista, RitmistaEdicion, EstadoLlegada, MovimientoTipo, MovimientoEstado } from "./types";
import { TALLES_CALZADO } from "./types";
import { getCarnaval } from "./carnaval";
import { familiaNaipe } from "./naipes-familias";

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
  nivel?: "Principiante" | "Avanzado";
}

/** Crea un ritmista en el padrón y lo suma a una edición (activa por defecto) como No confirmado */
export async function createRitmista(input: CreateRitmistaInput) {
  const { bateriaId } = await requireBateria();
  await prisma.naipe.findFirstOrThrow({ where: { bateriaId, nombre: familiaNaipe(input.naipeReferencia) } });
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
      nivel: input.nivel ?? "Avanzado",
      historial: {
        create: [{ naipe: input.naipeReferencia, periodo: `${destino.anioCarnaval}`, desde: destino.anioCarnaval }],
      },
    },
  });

  const indumentariaItems = ["Traje", "Remera"] as const;

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

export interface ImportRitmistaFila {
  fila: number;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  nacimientoIso: string;
  naipeReferencia: string;
  talleRemera: string;
  calzado: string;
}

export interface ImportRitmistasResultado {
  creados: number;
  errores: { fila: number; motivo: string }[];
}

/** Crea varios ritmistas de una planilla importada. Cada fila se valida y crea
 * de forma independiente: una fila inválida no aborta el resto de la importación. */
export async function createRitmistasBulk(
  filas: ImportRitmistaFila[],
  edicionId?: string,
): Promise<ImportRitmistasResultado> {
  const { bateriaId } = await requireBateria();
  const destino = await getEdicion(edicionId);
  if (!destino) throw new Error("Primero prepará el próximo Carnaval en Configuración.");

  const naipesValidos = new Set(
    (await prisma.naipe.findMany({ where: { bateriaId }, select: { nombre: true } })).map((n) => n.nombre),
  );

  const resultado: ImportRitmistasResultado = { creados: 0, errores: [] };
  const indumentariaItems = ["Traje", "Remera"] as const;

  for (const fila of filas) {
    try {
      if (!fila.nombre.trim() || !fila.apellido.trim()) throw new Error("Falta nombre o apellido.");
      if (!fila.naipeReferencia.trim()) throw new Error("Falta el instrumento.");
      if (!naipesValidos.has(familiaNaipe(fila.naipeReferencia))) {
        throw new Error(`Instrumento "${fila.naipeReferencia}" no existe en la batería.`);
      }
      let fechaNacimiento: Date | null = null;
      if (fila.nacimientoIso.trim()) {
        fechaNacimiento = new Date(fila.nacimientoIso);
        if (Number.isNaN(fechaNacimiento.getTime())) throw new Error(`Fecha de nacimiento inválida: "${fila.nacimientoIso}".`);
      }
      if (fila.calzado.trim() && !TALLES_CALZADO.includes(fila.calzado.trim())) {
        throw new Error(`Talle de calzado "${fila.calzado}" inválido. Válidos: ${TALLES_CALZADO.join(", ")}.`);
      }

      const ritmista = await prisma.ritmista.create({
        data: {
          bateriaId,
          nombre: fila.nombre.trim(),
          apellido: fila.apellido.trim(),
          dni: fila.dni.trim(),
          telefono: fila.telefono.trim(),
          fechaNacimiento: fechaNacimiento ?? new Date(0),
          naipeReferencia: fila.naipeReferencia,
          talleRemera: fila.talleRemera.trim(),
          calzado: fila.calzado.trim(),
          nivel: "Avanzado",
          historial: {
            create: [{ naipe: fila.naipeReferencia, periodo: `${destino.anioCarnaval}`, desde: destino.anioCarnaval }],
          },
        },
      });

      await prisma.ritmistaEdicion.create({
        data: {
          edicionId: destino.id,
          ritmistaId: ritmista.id,
          naipe: fila.naipeReferencia,
          estadoLlegada: "NoConfirmado",
          entregas: {
            create: indumentariaItems.map((item) => ({ item, estado: "Pendiente" as const })),
          },
        },
      });

      resultado.creados++;
    } catch (err) {
      resultado.errores.push({ fila: fila.fila, motivo: err instanceof Error ? err.message : "Error desconocido." });
    }
  }

  revalidatePath("/ritmistas/carnaval");
  revalidatePath("/ritmistas/base-de-datos");
  return resultado;
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
  naipeReferencia?: string;
}

export async function updateRitmista(input: UpdateRitmistaInput) {
  const { bateriaId } = await requireBateria();
  const naipeReferencia = input.naipeReferencia?.trim().replace(/\s+/g, " ");
  if (naipeReferencia) await prisma.naipe.findFirstOrThrow({ where: { bateriaId, nombre: familiaNaipe(naipeReferencia) } });
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
      ...(naipeReferencia ? { naipeReferencia } : {}),
    },
  });
  revalidatePath("/ritmistas/carnaval");
  revalidatePath("/ritmistas/base-de-datos");
}

/** Edición rápida desde la tabla del padrón: solo naipe de referencia y nivel. */
export async function updateRitmistaNaipeNivel(input: {
  id: string;
  naipeReferencia: string;
  nivel: "Principiante" | "Avanzado";
}) {
  const { bateriaId } = await requireBateria();
  const naipeReferencia = input.naipeReferencia.trim().replace(/\s+/g, " ");
  if (!naipeReferencia) throw new Error("Elegí un naipe.");
  await prisma.naipe.findFirstOrThrow({ where: { bateriaId, nombre: familiaNaipe(naipeReferencia) } });
  await prisma.ritmista.update({
    where: { id: input.id, bateriaId },
    data: { naipeReferencia, nivel: input.nivel },
  });
  revalidatePath("/ritmistas/carnaval");
  revalidatePath("/ritmistas/base-de-datos");
}

const RITMISTA_CAMPOS_EDITABLES = ["nombre", "apellido", "dni", "talleRemera", "calzado"] as const;
type RitmistaCampoEditable = (typeof RITMISTA_CAMPOS_EDITABLES)[number];

/** Edición celda a celda desde la tabla del padrón, un campo de texto a la vez. */
export async function updateRitmistaCampo(input: { id: string; campo: RitmistaCampoEditable; valor: string }) {
  const { bateriaId } = await requireBateria();
  if (!RITMISTA_CAMPOS_EDITABLES.includes(input.campo)) throw new Error("Campo no editable.");
  const valor = input.valor.trim();
  if ((input.campo === "nombre" || input.campo === "apellido") && !valor) throw new Error("Este campo no puede quedar vacío.");
  await prisma.ritmista.update({
    where: { id: input.id, bateriaId },
    data: { [input.campo]: valor },
  });
  revalidatePath("/ritmistas/carnaval");
  revalidatePath("/ritmistas/base-de-datos");
}

/** Elimina una entrada puntual del historial de naipes de un ritmista. */
export async function eliminarHistorialItem(input: { id: string; ritmistaId: string }) {
  const { bateriaId } = await requireBateria();
  await prisma.ritmista.findFirstOrThrow({ where: { id: input.ritmistaId, bateriaId } });
  await prisma.naipeHistorialItem.delete({ where: { id: input.id, ritmistaId: input.ritmistaId } });
  revalidatePath("/ritmistas/carnaval");
  revalidatePath("/ritmistas/base-de-datos");
}

function validarHistorialInput(naipe: string, anio: number) {
  const nombre = naipe.trim().replace(/\s+/g, " ");
  if (!nombre) throw new Error("Elegí un naipe.");
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) throw new Error("Ingresá un año válido.");
  return { naipe: nombre, periodo: String(anio), desde: anio };
}

/** Agrega una entrada al historial de naipes de un ritmista. */
export async function crearHistorialItem(input: { ritmistaId: string; naipe: string; anio: number }) {
  const { bateriaId } = await requireBateria();
  await prisma.ritmista.findFirstOrThrow({ where: { id: input.ritmistaId, bateriaId } });
  const data = validarHistorialInput(input.naipe, input.anio);
  const creado = await prisma.naipeHistorialItem.create({ data: { ritmistaId: input.ritmistaId, ...data } });
  revalidatePath("/ritmistas/carnaval");
  revalidatePath("/ritmistas/base-de-datos");
  return creado;
}

/** Edita una entrada existente del historial de naipes de un ritmista. */
export async function editarHistorialItem(input: { id: string; ritmistaId: string; naipe: string; anio: number }) {
  const { bateriaId } = await requireBateria();
  await prisma.ritmista.findFirstOrThrow({ where: { id: input.ritmistaId, bateriaId } });
  const data = validarHistorialInput(input.naipe, input.anio);
  await prisma.naipeHistorialItem.update({ where: { id: input.id, ritmistaId: input.ritmistaId }, data });
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

