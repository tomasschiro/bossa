"use server";
import { prisma } from "./prisma";
import { requireBateria } from "./session";
import { familiaNaipe } from "./naipes-familias";
import { saldoCaja, metricsBeneficios, metricsBeneficiosDistribuidos } from "./presupuesto-utils";
import { getBeneficiosGenerales, getBeneficiosDistribuidos } from "./presupuesto-actions";
import { hoyArgentina } from "./agenda-utils";
import type { EstadoLlegada } from "./types";

function saldoPendienteRitmista(movimientos: { tipo: string; monto: number }[]): number {
  const total = movimientos.filter((m) => m.tipo !== "pago" && m.tipo !== "rifa").reduce((n, m) => n + m.monto, 0);
  const pagado = movimientos.filter((m) => m.tipo === "pago" || m.tipo === "rifa").reduce((n, m) => n + m.monto, 0);
  return Math.max(total - pagado, 0);
}

const activaScope = (bateriaId: string) => ({ bateriaId, activa: true });

export interface DashboardNaipeComposicion {
  nombre: string;
  cantidad: number;
}

export interface DashboardEdicionComparativo {
  anioCarnaval: number;
  activa: boolean;
  cantidadRitmistas: number;
  saldoCaja: number;
  deudaTotal: number;
}

export interface DashboardCajaPunto {
  fechaIso: string;
  saldoAcumulado: number;
}

export interface DashboardProximoEvento {
  id: string;
  titulo: string;
  fechaIso: string;
  tipo: string;
}

export interface DashboardEconomia {
  saldoCaja: number;
  beneficiosGeneralesBruto: number;
  beneficiosGeneralesNeto: number;
  beneficiosDistribuidosVendido: number;
  beneficiosDistribuidosACaja: number;
  totalConsolidado: number;
}

export interface DashboardData {
  edicion: { id: string; anioCarnaval: number } | null;
  ritmistasActivos: number;
  composicionPorNaipe: DashboardNaipeComposicion[];
  saldoCaja: number;
  deudaTotal: number;
  proximoEvento: DashboardProximoEvento | null;
  edicionesCerradas: number;
  comparativoEdiciones: DashboardEdicionComparativo[];
  evolucionCaja: DashboardCajaPunto[];
  estadoLlegada: Record<EstadoLlegada, number>;
  economia: DashboardEconomia;
}

async function metricsEdicion(edicionId: string): Promise<{ cantidadRitmistas: number; saldoCaja: number; deudaTotal: number }> {
  const [ritmistasEdicion, cajaMovimientos] = await Promise.all([
    prisma.ritmistaEdicion.findMany({
      where: { edicionId },
      select: { movimientos: { select: { tipo: true, monto: true, estado: true } } },
    }),
    prisma.cajaMovimiento.findMany({ where: { edicionId }, select: { tipo: true, monto: true } }),
  ]);
  const deudaTotal = ritmistasEdicion.reduce(
    (sum, re) => sum + saldoPendienteRitmista(re.movimientos.map((m) => ({ tipo: m.tipo, monto: Number(m.monto) }))),
    0,
  );
  return {
    cantidadRitmistas: ritmistasEdicion.length,
    saldoCaja: saldoCaja(cajaMovimientos.map((m) => ({ tipo: m.tipo, monto: Number(m.monto) }))),
    deudaTotal,
  };
}

export async function getDashboard(): Promise<DashboardData> {
  const { bateriaId } = await requireBateria();
  const edicionActiva = await prisma.edicion.findFirst({ where: activaScope(bateriaId) });

  if (!edicionActiva) {
    // Sin edición activa no hay "preparada" (esa noción requiere una activa vigente): todas las inactivas son historial.
    const cerradas = await prisma.edicion.count({ where: { bateriaId, activa: false } });
    return {
      edicion: null,
      ritmistasActivos: 0,
      composicionPorNaipe: [],
      saldoCaja: 0,
      deudaTotal: 0,
      proximoEvento: null,
      edicionesCerradas: cerradas,
      comparativoEdiciones: [],
      evolucionCaja: [],
      estadoLlegada: { Confirmado: 0, "En duda": 0, "No confirmado": 0 },
      economia: {
        saldoCaja: 0,
        beneficiosGeneralesBruto: 0,
        beneficiosGeneralesNeto: 0,
        beneficiosDistribuidosVendido: 0,
        beneficiosDistribuidosACaja: 0,
        totalConsolidado: 0,
      },
    };
  }

  const [ritmistasEdicion, cajaMovimientos, proximoEvento, todasEdiciones, beneficiosGenerales, beneficiosDistribuidos] = await Promise.all([
    prisma.ritmistaEdicion.findMany({
      where: { edicionId: edicionActiva.id },
      select: {
        naipe: true,
        estadoLlegada: true,
        movimientos: { select: { tipo: true, monto: true } },
      },
    }),
    prisma.cajaMovimiento.findMany({
      where: { edicionId: edicionActiva.id },
      orderBy: { fecha: "asc" },
      select: { tipo: true, monto: true, fecha: true },
    }),
    prisma.agendaEvento.findFirst({
      where: { edicionId: edicionActiva.id, cancelado: false, fecha: { gte: new Date(hoyArgentina() + "T00:00:00Z") } },
      orderBy: { fecha: "asc" },
    }),
    prisma.edicion.findMany({ where: { bateriaId }, orderBy: { anioCarnaval: "desc" } }),
    getBeneficiosGenerales(),
    getBeneficiosDistribuidos(),
  ]);

  const ritmistasActivos = ritmistasEdicion.length;

  const composicionMap = new Map<string, number>();
  for (const re of ritmistasEdicion) {
    const nombre = familiaNaipe(re.naipe);
    composicionMap.set(nombre, (composicionMap.get(nombre) ?? 0) + 1);
  }
  const composicionPorNaipe = [...composicionMap.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const estadoLlegada: Record<EstadoLlegada, number> = { Confirmado: 0, "En duda": 0, "No confirmado": 0 };
  const ESTADO_DB_TO_UI: Record<string, EstadoLlegada> = { Confirmado: "Confirmado", EnDuda: "En duda", NoConfirmado: "No confirmado" };
  for (const re of ritmistasEdicion) {
    estadoLlegada[ESTADO_DB_TO_UI[re.estadoLlegada]]++;
  }

  const deudaTotal = ritmistasEdicion.reduce(
    (sum, re) => sum + saldoPendienteRitmista(re.movimientos.map((m) => ({ tipo: m.tipo, monto: Number(m.monto) }))),
    0,
  );

  const saldoTotal = saldoCaja(cajaMovimientos.map((m) => ({ tipo: m.tipo, monto: Number(m.monto) })));

  let acumulado = 0;
  const evolucionCaja: DashboardCajaPunto[] = cajaMovimientos.map((m) => {
    acumulado += m.tipo === "ingreso" ? Number(m.monto) : -Number(m.monto);
    return { fechaIso: m.fecha.toISOString().slice(0, 10), saldoAcumulado: acumulado };
  });

  const beneficiosGeneralesMetrics = metricsBeneficios(beneficiosGenerales);
  const beneficiosDistribuidosMetrics = metricsBeneficiosDistribuidos(beneficiosDistribuidos.tipos);
  // Consolidado: saldo de caja (ya incluye lo que entró de beneficios generales/distribuidos
  // como ingreso) + ganancia neta de beneficios generales que aún no se volcó a caja como
  // movimiento propio + lo vendido en beneficios distribuidos que no llegó a caja general
  // (quedó aplicado a deuda de ritmistas, por eso no está en saldoCaja).
  const economia: DashboardEconomia = {
    saldoCaja: saldoTotal,
    beneficiosGeneralesBruto: beneficiosGeneralesMetrics.recaudadoTotal,
    beneficiosGeneralesNeto: beneficiosGeneralesMetrics.gananciaNetaTotal,
    beneficiosDistribuidosVendido: beneficiosDistribuidosMetrics.vendidoTotal,
    beneficiosDistribuidosACaja: beneficiosDistribuidosMetrics.aCajaGeneral,
    totalConsolidado: saldoTotal + beneficiosDistribuidosMetrics.vendidoTotal - beneficiosDistribuidosMetrics.aCajaGeneral,
  };

  // La "preparada" (inactiva, año posterior a la activa) no cuenta como cerrada: es la próxima edición en preparación.
  const cerradas = todasEdiciones.filter((e) => !e.activa && e.anioCarnaval < edicionActiva.anioCarnaval);
  const comparativoBase = [edicionActiva, ...cerradas].sort((a, b) => b.anioCarnaval - a.anioCarnaval);
  const comparativoEdiciones = await Promise.all(
    comparativoBase.map(async (e) => {
      const m = e.id === edicionActiva.id
        ? { cantidadRitmistas: ritmistasActivos, saldoCaja: saldoTotal, deudaTotal }
        : await metricsEdicion(e.id);
      return { anioCarnaval: e.anioCarnaval, activa: e.activa, ...m };
    }),
  );

  return {
    edicion: { id: edicionActiva.id, anioCarnaval: edicionActiva.anioCarnaval },
    ritmistasActivos,
    composicionPorNaipe,
    saldoCaja: saldoTotal,
    deudaTotal,
    proximoEvento: proximoEvento
      ? { id: proximoEvento.id, titulo: proximoEvento.titulo, fechaIso: proximoEvento.fecha.toISOString().slice(0, 10), tipo: proximoEvento.tipo }
      : null,
    edicionesCerradas: cerradas.length,
    comparativoEdiciones,
    evolucionCaja,
    estadoLlegada,
    economia,
  };
}
