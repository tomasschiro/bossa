"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireBateria } from "./session";
import {
  mapCajaMovimiento,
  mapPresupuestoRubro,
  mapPresupuestoGasto,
  mapBeneficioGeneral,
  mapBeneficioDistribuidoTipo,
  CAJA_CATEGORIA_UI_TO_DB,
} from "./mappers";
import {
  desglosePorCategoria,
  saldoCaja,
  agruparRepuestosPorPrioridad,
  sumCostoEstimado,
  splitVentaRitmista,
} from "./presupuesto-utils";
import { saldoPendiente as saldoPendienteDe } from "./ritmistas-utils";
import { getInstrumentos, getRepuestos } from "./inventario-actions";
import type {
  CajaCategoriaUI,
  CajaMovimiento,
  PresupuestoRubro,
  PresupuestoRubroTipo,
  PresupuestoGasto,
  BeneficioGeneral,
  BeneficioDistribuidoTipo,
  StockIndumentaria,
  RitmistaOpcion,
} from "./types";
import type { Prisma } from "@prisma/client";

const activaScope = (bateriaId: string) => ({ bateriaId, activa: true });

function validarConcepto(concepto: string): string {
  const c = concepto.trim();
  if (!c || c.length > 200) throw new Error("El concepto es obligatorio y debe tener hasta 200 caracteres");
  return c;
}

function validarMonto(monto: number): number {
  if (!Number.isFinite(monto) || monto <= 0) throw new Error("El monto debe ser mayor a 0");
  return monto;
}

function validarCantidad(cantidad: number): number {
  const c = Math.trunc(cantidad);
  if (!Number.isFinite(c) || c < 1) throw new Error("La cantidad debe ser un entero mayor o igual a 1");
  return c;
}

function toFecha(fechaIso: string): Date {
  return new Date(fechaIso + "T00:00:00Z");
}

async function requireEdicionActivaId(tx: Prisma.TransactionClient, bateriaId: string): Promise<string> {
  const edicion = await tx.edicion.findFirstOrThrow({ where: activaScope(bateriaId) });
  return edicion.id;
}

async function crearCajaMovimientoTx(
  tx: Prisma.TransactionClient,
  edicionId: string,
  user: { name: string },
  input: { tipo: "ingreso" | "egreso"; categoria: CajaCategoriaUI; concepto: string; monto: number; fechaIso: string; esTraspaso?: boolean },
) {
  const concepto = validarConcepto(input.concepto);
  const monto = validarMonto(input.monto);
  return tx.cajaMovimiento.create({
    data: {
      edicionId,
      tipo: input.tipo,
      categoria: CAJA_CATEGORIA_UI_TO_DB[input.categoria],
      concepto,
      monto,
      fecha: toFecha(input.fechaIso),
      esTraspaso: input.esTraspaso ?? false,
      registradoPor: user.name,
    },
  });
}

// ---------- Reads ----------

export async function getCajaGeneral(): Promise<{
  movimientos: CajaMovimiento[];
  saldoTotal: number;
  desglose: { categoria: string; saldo: number }[];
}> {
  const { bateriaId } = await requireBateria();
  const rows = await prisma.cajaMovimiento.findMany({
    where: { edicion: activaScope(bateriaId) },
    orderBy: { fecha: "desc" },
  });
  const movimientos = rows.map(mapCajaMovimiento);
  return {
    movimientos,
    saldoTotal: saldoCaja(movimientos),
    desglose: desglosePorCategoria(movimientos),
  };
}

export async function getPresupuestoRubro(rubro: PresupuestoRubroTipo): Promise<PresupuestoRubro> {
  const { bateriaId } = await requireBateria();
  const row = await prisma.presupuestoRubro.findFirst({
    where: { rubro, edicion: activaScope(bateriaId) },
    include: { gastos: { orderBy: { fecha: "desc" } } },
  });
  if (!row) return { rubro, montoEstimado: 0, gastos: [] };
  return mapPresupuestoRubro(row);
}

export interface ProyeccionGrupo {
  items: { id: string; nombre: string; costoEstimado: number | null }[];
  total: number;
}

export async function getRepuestosProyectado(): Promise<{
  urgente: ProyeccionGrupo;
  deseable: ProyeccionGrupo;
  total: number;
}> {
  const [instrumentos, repuestos] = await Promise.all([getInstrumentos(), getRepuestos()]);
  const necesidades = [
    ...instrumentos.filter((i) => i.etiqueta === "Necesidad").map((i) => ({ id: i.id, nombre: i.tipo, costoEstimado: i.costoEstimado, prioridad: i.prioridad })),
    ...repuestos.filter((r) => r.etiqueta === "Necesidad").map((r) => ({ id: r.id, nombre: r.descripcion, costoEstimado: r.costoEstimado, prioridad: r.prioridad })),
  ];
  const { Urgente, Deseable } = agruparRepuestosPorPrioridad(necesidades);
  return {
    urgente: { items: Urgente, total: sumCostoEstimado(Urgente) },
    deseable: { items: Deseable, total: sumCostoEstimado(Deseable) },
    total: sumCostoEstimado(necesidades),
  };
}

export async function getBeneficiosGenerales(): Promise<BeneficioGeneral[]> {
  const { bateriaId } = await requireBateria();
  const rows = await prisma.beneficio.findMany({
    where: { edicion: activaScope(bateriaId) },
    include: { gastos: true },
    orderBy: { fecha: "desc" },
  });
  return rows.map(mapBeneficioGeneral);
}

export async function getBeneficiosDistribuidos(): Promise<{ tipos: BeneficioDistribuidoTipo[] }> {
  const { bateriaId } = await requireBateria();
  const rows = await prisma.beneficioDistribuidoTipo.findMany({
    where: { edicion: activaScope(bateriaId) },
    include: {
      vendedores: {
        include: {
          ventas: { orderBy: { fecha: "desc" }, include: { cajaMovimiento: { select: { monto: true } } } },
          ritmistaEdicion: { include: { ritmista: true, movimientos: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return { tipos: rows.map((t) => mapBeneficioDistribuidoTipo(t, saldoPendienteDe)) };
}

export async function getRitmistasParaVendedor(): Promise<RitmistaOpcion[]> {
  const { bateriaId } = await requireBateria();
  const rows = await prisma.ritmistaEdicion.findMany({
    where: { edicion: activaScope(bateriaId) },
    include: { ritmista: true },
    orderBy: [{ ritmista: { nombre: "asc" } }],
  });
  return rows.map((re) => ({ ritmistaEdicionId: re.id, nombre: `${re.ritmista.nombre} ${re.ritmista.apellido}` }));
}

export async function getStockIndumentaria(): Promise<StockIndumentaria[]> {
  const { bateriaId } = await requireBateria();
  const [stockRows, ritmistasEdicion] = await Promise.all([
    prisma.stockIndumentaria.findMany({ where: { edicion: activaScope(bateriaId) } }),
    prisma.ritmistaEdicion.findMany({
      where: { edicion: activaScope(bateriaId) },
      select: { ritmista: { select: { talleRemera: true } }, entregas: { where: { item: "RemeraOficial" }, select: { estado: true } } },
    }),
  ]);

  const entregadaPorTalle = new Map<string, number>();
  const pendientePorTalle = new Map<string, number>();
  for (const re of ritmistasEdicion) {
    const talle = re.ritmista.talleRemera;
    const entrega = re.entregas[0];
    if (entrega?.estado === "Entregado") {
      entregadaPorTalle.set(talle, (entregadaPorTalle.get(talle) ?? 0) + 1);
    } else {
      pendientePorTalle.set(talle, (pendientePorTalle.get(talle) ?? 0) + 1);
    }
  }

  const talles = new Set<string>([
    ...stockRows.map((s) => s.talle),
    ...entregadaPorTalle.keys(),
    ...pendientePorTalle.keys(),
  ]);

  return [...talles].sort((a, b) => a.localeCompare(b, "es")).map((talle) => ({
    talle,
    cantidadStock: stockRows.find((s) => s.talle === talle)?.cantidadStock ?? 0,
    cantidadEntregada: entregadaPorTalle.get(talle) ?? 0,
    cantidadPendiente: pendientePorTalle.get(talle) ?? 0,
  }));
}

// ---------- Writes ----------

export async function crearCajaMovimiento(input: {
  tipo: "ingreso" | "egreso";
  categoria: CajaCategoriaUI;
  concepto: string;
  monto: number;
  fechaIso: string;
}): Promise<CajaMovimiento> {
  const { bateriaId, user } = await requireBateria();
  const movimiento = await prisma.$transaction(async (tx) => {
    const edicionId = await requireEdicionActivaId(tx, bateriaId);
    const m = await crearCajaMovimientoTx(tx, edicionId, user, input);
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "crearCajaMovimiento", entidadId: m.id, datos: JSON.parse(JSON.stringify(m)) },
    });
    return m;
  });
  revalidatePath("/", "layout");
  return mapCajaMovimiento(movimiento);
}

export async function eliminarCajaMovimiento(id: string): Promise<{ ok: true } | { error: string }> {
  const { bateriaId, user } = await requireBateria();
  const movimiento = await prisma.cajaMovimiento.findUniqueOrThrow({
    where: { id, edicion: activaScope(bateriaId) },
    include: { presupuestoGasto: true, beneficio: true, beneficioDistribuidoVenta: true },
  });
  if (movimiento.presupuestoGasto || movimiento.beneficio || movimiento.beneficioDistribuidoVenta) {
    return { error: "Este movimiento está vinculado a un gasto/beneficio del módulo — eliminalo desde ahí." };
  }
  await prisma.$transaction(async (tx) => {
    await tx.cajaMovimiento.delete({ where: { id, edicion: activaScope(bateriaId) } });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "eliminarCajaMovimiento", entidadId: id, datos: JSON.parse(JSON.stringify(movimiento)) },
    });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

const CATEGORIA_CAJA_A_RUBRO: Partial<Record<CajaCategoriaUI, PresupuestoRubroTipo>> = {
  "Fantasía/temática": "Fantasia",
  Remeras: "Remeras",
};

export async function traspasarCaja(input: {
  categoriaOrigen: CajaCategoriaUI;
  categoriaDestino: CajaCategoriaUI;
  monto: number;
  concepto?: string;
}): Promise<{ ok: true } | { error: string }> {
  const { bateriaId, user } = await requireBateria();
  if (input.categoriaOrigen === input.categoriaDestino) {
    return { error: "Elegí categorías de origen y destino distintas." };
  }
  const monto = validarMonto(input.monto);

  const resultado = await prisma.$transaction(async (tx) => {
    const edicionId = await requireEdicionActivaId(tx, bateriaId);
    const movimientos = await tx.cajaMovimiento.findMany({ where: { edicionId } });
    const saldoOrigen = movimientos
      .filter((m) => m.categoria === CAJA_CATEGORIA_UI_TO_DB[input.categoriaOrigen])
      .reduce((sum, m) => sum + (m.tipo === "ingreso" ? Number(m.monto) : -Number(m.monto)), 0);
    if (monto > saldoOrigen) {
      return { error: "El monto no puede superar el saldo disponible de la categoría origen." };
    }

    const fechaIso = new Date().toISOString().slice(0, 10);
    const conceptoBase = input.concepto?.trim() || `Traspaso ${input.categoriaOrigen} → ${input.categoriaDestino}`;

    const egreso = await crearCajaMovimientoTx(tx, edicionId, user, {
      tipo: "egreso",
      categoria: input.categoriaOrigen,
      concepto: conceptoBase,
      monto,
      fechaIso,
      esTraspaso: true,
    });
    const ingreso = await crearCajaMovimientoTx(tx, edicionId, user, {
      tipo: "ingreso",
      categoria: input.categoriaDestino,
      concepto: conceptoBase,
      monto,
      fechaIso,
      esTraspaso: true,
    });

    const rubroDestino = CATEGORIA_CAJA_A_RUBRO[input.categoriaDestino];
    let rubroActualizado = null;
    if (rubroDestino) {
      const rubroRow = await tx.presupuestoRubro.findFirst({ where: { rubro: rubroDestino, edicionId } });
      rubroActualizado = rubroRow
        ? await tx.presupuestoRubro.update({ where: { id: rubroRow.id }, data: { montoEstimado: { increment: monto } } })
        : await tx.presupuestoRubro.create({ data: { edicionId, rubro: rubroDestino, montoEstimado: monto } });
    }

    await tx.auditoria.create({
      data: {
        bateriaId,
        usuarioId: user.id,
        registradoPor: user.name,
        accion: "traspasarCaja",
        entidadId: egreso.id,
        datos: JSON.parse(JSON.stringify({ egreso, ingreso, rubroActualizado })),
      },
    });
    return { ok: true } as const;
  });
  if ("error" in resultado) return resultado;
  revalidatePath("/", "layout");
  return resultado;
}

export async function guardarPresupuestoRubro(input: { rubro: PresupuestoRubroTipo; montoEstimado: number }): Promise<void> {
  const { bateriaId, user } = await requireBateria();
  if (!Number.isFinite(input.montoEstimado) || input.montoEstimado < 0) throw new Error("El monto estimado debe ser mayor o igual a 0");
  await prisma.$transaction(async (tx) => {
    const anterior = await tx.presupuestoRubro.findFirst({ where: { rubro: input.rubro, edicion: activaScope(bateriaId) } });
    const edicion = await tx.edicion.findFirstOrThrow({ where: activaScope(bateriaId) });
    const row = anterior
      ? await tx.presupuestoRubro.update({ where: { id: anterior.id }, data: { montoEstimado: input.montoEstimado } })
      : await tx.presupuestoRubro.create({ data: { edicionId: edicion.id, rubro: input.rubro, montoEstimado: input.montoEstimado } });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "guardarPresupuestoRubro", entidadId: row.id, datos: JSON.parse(JSON.stringify({ anterior, nuevo: row })) },
    });
  });
  revalidatePath("/", "layout");
}

const RUBRO_A_CATEGORIA_CAJA: Record<PresupuestoRubroTipo, CajaCategoriaUI> = {
  Fantasia: "Fantasía/temática",
  Remeras: "Remeras",
};

export async function crearGastoPresupuesto(input: {
  rubro: PresupuestoRubroTipo;
  categoria: string;
  concepto: string;
  costoUnidad: number;
  cantidad: number;
  fechaIso: string;
}): Promise<PresupuestoGasto> {
  const { bateriaId, user } = await requireBateria();
  const categoria = input.categoria.trim();
  if (!categoria) throw new Error("La categoría es obligatoria");
  const costoUnidad = validarMonto(input.costoUnidad);
  const cantidad = validarCantidad(input.cantidad);
  const concepto = validarConcepto(input.concepto);
  const monto = costoUnidad * cantidad;

  const gasto = await prisma.$transaction(async (tx) => {
    const edicion = await tx.edicion.findFirstOrThrow({ where: activaScope(bateriaId) });
    let rubroRow = await tx.presupuestoRubro.findFirst({ where: { rubro: input.rubro, edicionId: edicion.id } });
    if (!rubroRow) {
      rubroRow = await tx.presupuestoRubro.create({ data: { edicionId: edicion.id, rubro: input.rubro, montoEstimado: 0 } });
    }
    const cajaMovimiento = await crearCajaMovimientoTx(tx, edicion.id, user, {
      tipo: "egreso",
      categoria: RUBRO_A_CATEGORIA_CAJA[input.rubro],
      concepto,
      monto,
      fechaIso: input.fechaIso,
    });
    const g = await tx.presupuestoGasto.create({
      data: {
        presupuestoRubroId: rubroRow.id,
        categoria,
        concepto,
        costoUnidad,
        cantidad,
        monto,
        fecha: toFecha(input.fechaIso),
        cajaMovimientoId: cajaMovimiento.id,
        registradoPor: user.name,
      },
    });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "crearGastoPresupuesto", entidadId: g.id, datos: JSON.parse(JSON.stringify({ gasto: g, cajaMovimiento })) },
    });
    return g;
  });
  revalidatePath("/", "layout");
  return mapPresupuestoGasto(gasto);
}

export async function actualizarGastoPresupuesto(input: {
  id: string;
  categoria: string;
  concepto: string;
  costoUnidad: number;
  cantidad: number;
  fechaIso: string;
}): Promise<void> {
  const { bateriaId, user } = await requireBateria();
  const categoria = input.categoria.trim();
  if (!categoria) throw new Error("La categoría es obligatoria");
  const costoUnidad = validarMonto(input.costoUnidad);
  const cantidad = validarCantidad(input.cantidad);
  const concepto = validarConcepto(input.concepto);
  const monto = costoUnidad * cantidad;

  await prisma.$transaction(async (tx) => {
    const anterior = await tx.presupuestoGasto.findUniqueOrThrow({
      where: { id: input.id, presupuestoRubro: { edicion: activaScope(bateriaId) } },
    });
    const nuevo = await tx.presupuestoGasto.update({
      where: { id: input.id },
      data: { categoria, concepto, costoUnidad, cantidad, monto, fecha: toFecha(input.fechaIso) },
    });
    if (anterior.cajaMovimientoId) {
      await tx.cajaMovimiento.update({
        where: { id: anterior.cajaMovimientoId },
        data: { concepto, monto, fecha: toFecha(input.fechaIso) },
      });
    }
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "actualizarGastoPresupuesto", entidadId: nuevo.id, datos: JSON.parse(JSON.stringify({ anterior, nuevo })) },
    });
  });
  revalidatePath("/", "layout");
}

export async function eliminarGastoPresupuesto(id: string): Promise<void> {
  const { bateriaId, user } = await requireBateria();
  await prisma.$transaction(async (tx) => {
    const gasto = await tx.presupuestoGasto.findUniqueOrThrow({
      where: { id, presupuestoRubro: { edicion: activaScope(bateriaId) } },
    });
    await tx.presupuestoGasto.delete({ where: { id } });
    if (gasto.cajaMovimientoId) {
      await tx.cajaMovimiento.delete({ where: { id: gasto.cajaMovimientoId } });
    }
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "eliminarGastoPresupuesto", entidadId: id, datos: JSON.parse(JSON.stringify(gasto)) },
    });
  });
  revalidatePath("/", "layout");
}

export async function guardarBeneficio(input: {
  id?: string;
  nombre: string;
  fechaIso: string;
  objetivoRecaudacion?: number | null;
  ingresoBruto: number;
  gastos: { id?: string; concepto: string; costoUnidad: number; cantidad: number }[];
}): Promise<void> {
  const { bateriaId, user } = await requireBateria();
  const nombre = input.nombre.trim();
  if (!nombre || nombre.length > 150) throw new Error("Ingresá un nombre de hasta 150 caracteres");
  if (!Number.isFinite(input.ingresoBruto) || input.ingresoBruto < 0) throw new Error("El ingreso bruto debe ser mayor o igual a 0");
  for (const g of input.gastos) {
    if (!g.concepto.trim()) throw new Error("Cada gasto necesita un concepto");
    if (!Number.isFinite(g.costoUnidad) || g.costoUnidad <= 0) throw new Error("Cada gasto necesita un costo por unidad mayor a 0");
    if (!Number.isFinite(g.cantidad) || Math.trunc(g.cantidad) < 1) throw new Error("Cada gasto necesita una cantidad entera mayor o igual a 1");
  }

  await prisma.$transaction(async (tx) => {
    const edicion = await tx.edicion.findFirstOrThrow({ where: activaScope(bateriaId) });
    const anterior = input.id
      ? await tx.beneficio.findUniqueOrThrow({ where: { id: input.id, edicionId: edicion.id }, include: { gastos: true } })
      : null;

    const agendaEvento = anterior?.agendaEventoId
      ? await tx.agendaEvento.update({
          where: { id: anterior.agendaEventoId },
          data: { titulo: nombre, fecha: toFecha(input.fechaIso), actualizadoPor: user.name },
        })
      : await tx.agendaEvento.create({
          data: {
            edicionId: edicion.id,
            tipo: "beneficio",
            titulo: nombre,
            fecha: toFecha(input.fechaIso),
            registradoPor: user.name,
            actualizadoPor: user.name,
          },
        });

    const cajaData = {
      tipo: "ingreso" as const,
      categoria: "OtrosGastosGenerales" as const,
      concepto: nombre,
      monto: input.ingresoBruto,
      fecha: toFecha(input.fechaIso),
    };
    const cajaMovimiento = anterior?.cajaMovimientoId
      ? await tx.cajaMovimiento.update({ where: { id: anterior.cajaMovimientoId }, data: cajaData })
      : await tx.cajaMovimiento.create({ data: { ...cajaData, edicionId: edicion.id, registradoPor: user.name } });

    const beneficioData = {
      nombre,
      fecha: toFecha(input.fechaIso),
      objetivoRecaudacion: input.objetivoRecaudacion ?? null,
      ingresoBruto: input.ingresoBruto,
      agendaEventoId: agendaEvento.id,
      cajaMovimientoId: cajaMovimiento.id,
    };
    const beneficio = anterior
      ? await tx.beneficio.update({ where: { id: anterior.id }, data: beneficioData })
      : await tx.beneficio.create({ data: { ...beneficioData, edicionId: edicion.id, registradoPor: user.name } });

    const idsEnviados = new Set(input.gastos.filter((g) => g.id).map((g) => g.id));
    const aEliminar = (anterior?.gastos ?? []).filter((g) => !idsEnviados.has(g.id));
    for (const g of aEliminar) {
      await tx.beneficioGasto.delete({ where: { id: g.id } });
    }
    for (const g of input.gastos) {
      const costoUnidad = validarMonto(g.costoUnidad);
      const cantidad = validarCantidad(g.cantidad);
      const monto = costoUnidad * cantidad;
      if (g.id) {
        await tx.beneficioGasto.update({ where: { id: g.id }, data: { concepto: g.concepto.trim(), costoUnidad, cantidad, monto } });
      } else {
        await tx.beneficioGasto.create({ data: { beneficioId: beneficio.id, concepto: g.concepto.trim(), costoUnidad, cantidad, monto } });
      }
    }

    await tx.auditoria.create({
      data: {
        bateriaId,
        usuarioId: user.id,
        registradoPor: user.name,
        accion: anterior ? "actualizarBeneficio" : "crearBeneficio",
        entidadId: beneficio.id,
        datos: JSON.parse(JSON.stringify({ anterior, beneficio, agendaEvento, cajaMovimiento })),
      },
    });
  });
  revalidatePath("/", "layout");
}

export async function eliminarBeneficio(id: string): Promise<void> {
  const { bateriaId, user } = await requireBateria();
  await prisma.$transaction(async (tx) => {
    const beneficio = await tx.beneficio.findUniqueOrThrow({ where: { id, edicion: activaScope(bateriaId) } });
    await tx.beneficio.delete({ where: { id } });
    if (beneficio.agendaEventoId) await tx.agendaEvento.delete({ where: { id: beneficio.agendaEventoId } });
    if (beneficio.cajaMovimientoId) await tx.cajaMovimiento.delete({ where: { id: beneficio.cajaMovimientoId } });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "eliminarBeneficio", entidadId: id, datos: JSON.parse(JSON.stringify(beneficio)) },
    });
  });
  revalidatePath("/", "layout");
}

export async function crearBeneficioDistribuidoTipo(input: {
  nombre: string;
  precioUnidad: number;
  fechaLimiteIso: string;
}): Promise<BeneficioDistribuidoTipo> {
  const { bateriaId, user } = await requireBateria();
  const nombre = input.nombre.trim();
  if (!nombre || nombre.length > 120) throw new Error("Ingresá un nombre de hasta 120 caracteres");
  if (!Number.isFinite(input.precioUnidad) || input.precioUnidad <= 0) throw new Error("El precio por unidad debe ser mayor a 0");

  const tipo = await prisma.$transaction(async (tx) => {
    const edicion = await tx.edicion.findFirstOrThrow({ where: activaScope(bateriaId) });
    const t = await tx.beneficioDistribuidoTipo.create({
      data: { edicionId: edicion.id, nombre, precioUnidad: input.precioUnidad, fechaLimite: toFecha(input.fechaLimiteIso) },
    });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "crearBeneficioDistribuidoTipo", entidadId: t.id, datos: JSON.parse(JSON.stringify(t)) },
    });
    return t;
  });
  revalidatePath("/", "layout");
  return { id: tipo.id, nombre: tipo.nombre, precioUnidad: Number(tipo.precioUnidad), fechaLimiteIso: input.fechaLimiteIso, vendedores: [] };
}

export async function actualizarBeneficioDistribuidoTipo(input: {
  id: string;
  nombre: string;
  precioUnidad: number;
  fechaLimiteIso: string;
}): Promise<void> {
  const { bateriaId, user } = await requireBateria();
  const nombre = input.nombre.trim();
  if (!nombre || nombre.length > 120) throw new Error("Ingresá un nombre de hasta 120 caracteres");
  if (!Number.isFinite(input.precioUnidad) || input.precioUnidad <= 0) throw new Error("El precio por unidad debe ser mayor a 0");

  await prisma.$transaction(async (tx) => {
    const anterior = await tx.beneficioDistribuidoTipo.findUniqueOrThrow({ where: { id: input.id, edicion: activaScope(bateriaId) } });
    const nuevo = await tx.beneficioDistribuidoTipo.update({
      where: { id: input.id },
      data: { nombre, precioUnidad: input.precioUnidad, fechaLimite: toFecha(input.fechaLimiteIso) },
    });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "actualizarBeneficioDistribuidoTipo", entidadId: nuevo.id, datos: JSON.parse(JSON.stringify({ anterior, nuevo })) },
    });
  });
  revalidatePath("/", "layout");
}

export async function eliminarBeneficioDistribuidoTipo(id: string): Promise<{ ok: true } | { error: string }> {
  const { bateriaId, user } = await requireBateria();
  const tipo = await prisma.beneficioDistribuidoTipo.findUniqueOrThrow({
    where: { id, edicion: activaScope(bateriaId) },
    include: { vendedores: { include: { ventas: true } } },
  });
  if (tipo.vendedores.some((v) => v.ventas.length > 0)) {
    return { error: "Este tipo tiene ventas registradas — no se puede eliminar." };
  }
  await prisma.$transaction(async (tx) => {
    await tx.beneficioDistribuidoTipo.delete({ where: { id } });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "eliminarBeneficioDistribuidoTipo", entidadId: id, datos: JSON.parse(JSON.stringify(tipo)) },
    });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function crearVendedor(input: {
  tipoId: string;
  ritmistaEdicionId?: string | null;
  nombreExterno?: string | null;
  contactoExterno?: string | null;
  unidadesAsignadas: number;
}): Promise<{ ok: true } | { error: string }> {
  const { bateriaId, user } = await requireBateria();
  const esRitmista = !!input.ritmistaEdicionId;
  const esExterno = !!input.nombreExterno?.trim();
  if (esRitmista === esExterno) {
    return { error: "Elegí un ritmista o cargá un colaborador externo, no ambos." };
  }
  const unidadesAsignadas = Math.trunc(input.unidadesAsignadas);
  if (!Number.isFinite(unidadesAsignadas) || unidadesAsignadas < 0) {
    return { error: "Las unidades asignadas deben ser un entero mayor o igual a 0" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.beneficioDistribuidoTipo.findUniqueOrThrow({ where: { id: input.tipoId, edicion: activaScope(bateriaId) } });
    const vendedor = await tx.beneficioDistribuidoVendedor.create({
      data: {
        tipoId: input.tipoId,
        ritmistaEdicionId: esRitmista ? input.ritmistaEdicionId : null,
        nombreExterno: esExterno ? input.nombreExterno!.trim() : null,
        contactoExterno: esExterno ? input.contactoExterno?.trim() || null : null,
        unidadesAsignadas,
      },
    });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "crearVendedor", entidadId: vendedor.id, datos: JSON.parse(JSON.stringify(vendedor)) },
    });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function actualizarVendedor(input: { id: string; unidadesAsignadas: number }): Promise<void> {
  const { bateriaId, user } = await requireBateria();
  const unidadesAsignadas = Math.trunc(input.unidadesAsignadas);
  if (!Number.isFinite(unidadesAsignadas) || unidadesAsignadas < 0) throw new Error("Las unidades asignadas deben ser un entero mayor o igual a 0");

  await prisma.$transaction(async (tx) => {
    const anterior = await tx.beneficioDistribuidoVendedor.findUniqueOrThrow({ where: { id: input.id, tipo: { edicion: activaScope(bateriaId) } } });
    const nuevo = await tx.beneficioDistribuidoVendedor.update({ where: { id: input.id }, data: { unidadesAsignadas } });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "actualizarVendedor", entidadId: nuevo.id, datos: JSON.parse(JSON.stringify({ anterior, nuevo })) },
    });
  });
  revalidatePath("/", "layout");
}

export async function eliminarVendedor(id: string): Promise<{ ok: true } | { error: string }> {
  const { bateriaId, user } = await requireBateria();
  const vendedor = await prisma.beneficioDistribuidoVendedor.findUniqueOrThrow({
    where: { id, tipo: { edicion: activaScope(bateriaId) } },
    include: { ventas: true },
  });
  if (vendedor.ventas.length > 0) {
    return { error: "Este vendedor tiene ventas registradas — no se puede eliminar." };
  }
  await prisma.$transaction(async (tx) => {
    await tx.beneficioDistribuidoVendedor.delete({ where: { id } });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "eliminarVendedor", entidadId: id, datos: JSON.parse(JSON.stringify(vendedor)) },
    });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function registrarVenta(input: {
  vendedorId: string;
  unidades?: number | null;
  montoDirecto?: number | null;
  fechaIso: string;
}): Promise<{ ok: true } | { error: string }> {
  const { bateriaId, user } = await requireBateria();
  const unidadesDadas = input.unidades != null;
  const montoDadas = input.montoDirecto != null;
  if (unidadesDadas === montoDadas) {
    return { error: "Ingresá unidades vendidas o un monto directo, no ambos." };
  }

  const vendedor = await prisma.beneficioDistribuidoVendedor.findUniqueOrThrow({
    where: { id: input.vendedorId, tipo: { edicion: activaScope(bateriaId) } },
    include: { tipo: true, ritmistaEdicion: { include: { ritmista: true, movimientos: true } } },
  });

  const montoVenta = unidadesDadas ? input.unidades! * Number(vendedor.tipo.precioUnidad) : input.montoDirecto!;
  if (!Number.isFinite(montoVenta) || montoVenta <= 0) {
    return { error: "El monto de la venta debe ser mayor a 0" };
  }

  await prisma.$transaction(async (tx) => {
    const edicionId = await requireEdicionActivaId(tx, bateriaId);
    let movimientoCuentaCorrienteId: string | null = null;
    let cajaMovimientoId: string | null = null;
    let breakdown: Record<string, number> = { montoVenta };

    if (!vendedor.ritmistaEdicionId || !vendedor.ritmistaEdicion) {
      const caja = await crearCajaMovimientoTx(tx, edicionId, user, {
        tipo: "ingreso",
        categoria: "Otros gastos generales",
        concepto: `Venta ${vendedor.tipo.nombre} — ${vendedor.nombreExterno}`,
        monto: montoVenta,
        fechaIso: input.fechaIso,
      });
      cajaMovimientoId = caja.id;
    } else {
      const re = vendedor.ritmistaEdicion;
      const saldo = saldoPendienteDe({
        id: re.id,
        ritmistaId: re.ritmistaId,
        edicionAnio: 0,
        naipe: re.naipe,
        estadoLlegada: "Confirmado",
        movimientos: re.movimientos.map((m) => ({ id: m.id, tipo: m.tipo, concepto: m.concepto, fechaIso: m.fecha.toISOString(), monto: Number(m.monto), estado: m.estado, registradoPor: m.registradoPor })),
        entregas: [],
        beneficiosAsignados: re.beneficiosAsignados,
        beneficiosVendidos: re.beneficiosVendidos,
        beneficios: [],
      });
      const { aplicadoADeuda, excedente } = splitVentaRitmista(montoVenta, saldo);
      breakdown = { montoVenta, saldoPendiente: saldo, aplicadoADeuda, excedente };

      if (aplicadoADeuda > 0) {
        const mov = await tx.movimientoCuentaCorriente.create({
          data: {
            ritmistaEdicionId: re.id,
            tipo: "rifa",
            concepto: `Venta ${vendedor.tipo.nombre}`,
            fecha: toFecha(input.fechaIso),
            monto: aplicadoADeuda,
            estado: "Pagado",
            registradoPor: user.name,
          },
        });
        movimientoCuentaCorrienteId = mov.id;
      }
      if (excedente > 0) {
        const caja = await crearCajaMovimientoTx(tx, edicionId, user, {
          tipo: "ingreso",
          categoria: "Otros gastos generales",
          concepto: `Excedente venta ${vendedor.tipo.nombre} — ${re.ritmista.nombre} ${re.ritmista.apellido}`,
          monto: excedente,
          fechaIso: input.fechaIso,
        });
        cajaMovimientoId = caja.id;
      }
    }

    const venta = await tx.beneficioDistribuidoVenta.create({
      data: {
        vendedorId: input.vendedorId,
        unidades: unidadesDadas ? input.unidades : null,
        monto: montoVenta,
        fecha: toFecha(input.fechaIso),
        movimientoCuentaCorrienteId,
        cajaMovimientoId,
        registradoPor: user.name,
      },
    });

    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "registrarVenta", entidadId: venta.id, datos: breakdown },
    });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function revertirVenta(id: string): Promise<void> {
  const { bateriaId, user } = await requireBateria();
  await prisma.$transaction(async (tx) => {
    const venta = await tx.beneficioDistribuidoVenta.findUniqueOrThrow({
      where: { id, vendedor: { tipo: { edicion: activaScope(bateriaId) } } },
    });
    await tx.beneficioDistribuidoVenta.delete({ where: { id } });
    if (venta.movimientoCuentaCorrienteId) await tx.movimientoCuentaCorriente.delete({ where: { id: venta.movimientoCuentaCorrienteId } });
    if (venta.cajaMovimientoId) await tx.cajaMovimiento.delete({ where: { id: venta.cajaMovimientoId } });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "revertirVenta", entidadId: id, datos: JSON.parse(JSON.stringify(venta)) },
    });
  });
  revalidatePath("/", "layout");
}

export async function guardarStockIndumentaria(input: { talle: string; cantidadStock: number }): Promise<void> {
  const { bateriaId, user } = await requireBateria();
  const talle = input.talle.trim();
  if (!talle) throw new Error("El talle es obligatorio");
  const cantidadStock = Math.trunc(input.cantidadStock);
  if (!Number.isFinite(cantidadStock) || cantidadStock < 0) throw new Error("La cantidad en stock debe ser un entero mayor o igual a 0");

  await prisma.$transaction(async (tx) => {
    const edicion = await tx.edicion.findFirstOrThrow({ where: activaScope(bateriaId) });
    const anterior = await tx.stockIndumentaria.findFirst({ where: { edicionId: edicion.id, talle } });
    const row = anterior
      ? await tx.stockIndumentaria.update({ where: { id: anterior.id }, data: { cantidadStock } })
      : await tx.stockIndumentaria.create({ data: { edicionId: edicion.id, talle, cantidadStock } });
    await tx.auditoria.create({
      data: { bateriaId, usuarioId: user.id, registradoPor: user.name, accion: "guardarStockIndumentaria", entidadId: row.id, datos: JSON.parse(JSON.stringify({ anterior, nuevo: row })) },
    });
  });
  revalidatePath("/", "layout");
}
