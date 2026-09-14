import { prisma } from "./prisma";
import { requireBateria } from "./session";
import { mapRitmista, mapRitmistaEdicion, mapCajaMovimiento } from "./mappers";
import type { Ritmista, RitmistaEdicion } from "./types";
import { saldoCaja } from "./presupuesto-utils";

export interface HistorialEdicion {
  id: string;
  anioCarnaval: number;
  cantidadRitmistas: number;
  saldoCaja: number;
  deudaTotal: number;
}

/** La preparada (inactiva, año posterior a la activa) no es historial: se está trabajando en paralelo. */
async function idEdicionPreparada(bateriaId: string): Promise<string | null> {
  const todas = await prisma.edicion.findMany({ where: { bateriaId }, orderBy: { anioCarnaval: "desc" } });
  const activa = todas.find((e) => e.activa);
  const preparada = todas.find((e) => !e.activa && (!activa || e.anioCarnaval > activa.anioCarnaval));
  return preparada?.id ?? null;
}

export async function getHistorialEdiciones(): Promise<HistorialEdicion[]> {
  const { bateriaId } = await requireBateria();
  const excluida = await idEdicionPreparada(bateriaId);
  const ediciones = await prisma.edicion.findMany({
    where: { bateriaId, activa: false, id: excluida ? { not: excluida } : undefined },
    orderBy: { anioCarnaval: "desc" },
  });
  return Promise.all(
    ediciones.map(async (e) => {
      const [cantidadRitmistas, movimientosCuenta, cajaMovimientos] = await Promise.all([
        prisma.ritmistaEdicion.count({ where: { edicionId: e.id } }),
        prisma.movimientoCuentaCorriente.groupBy({
          by: ["ritmistaEdicionId", "tipo"],
          where: { ritmistaEdicion: { edicionId: e.id } },
          _sum: { monto: true },
        }),
        prisma.cajaMovimiento.findMany({ where: { edicionId: e.id }, select: { tipo: true, monto: true } }),
      ]);
      const porRitmista = new Map<string, { total: number; pagado: number }>();
      for (const row of movimientosCuenta) {
        const entry = porRitmista.get(row.ritmistaEdicionId) ?? { total: 0, pagado: 0 };
        const monto = Number(row._sum.monto ?? 0);
        if (row.tipo === "pago" || row.tipo === "rifa") entry.pagado += monto;
        else entry.total += monto;
        porRitmista.set(row.ritmistaEdicionId, entry);
      }
      const deudaTotal = [...porRitmista.values()].reduce(
        (sum, { total, pagado }) => sum + Math.max(total - pagado, 0),
        0,
      );
      return {
        id: e.id,
        anioCarnaval: e.anioCarnaval,
        cantidadRitmistas,
        saldoCaja: saldoCaja(cajaMovimientos.map((m) => ({ tipo: m.tipo, monto: Number(m.monto) }))),
        deudaTotal,
      };
    }),
  );
}

export async function getEdicionHistorial(edicionId: string): Promise<{ id: string; anioCarnaval: number } | null> {
  const { bateriaId } = await requireBateria();
  const edicion = await prisma.edicion.findUnique({ where: { id: edicionId, bateriaId } });
  if (!edicion || edicion.activa || edicion.id === (await idEdicionPreparada(bateriaId))) return null;
  return { id: edicion.id, anioCarnaval: edicion.anioCarnaval };
}

export async function getRitmistasEdicionHistorial(
  edicionId: string,
): Promise<{ ritmista: Ritmista; edicion: RitmistaEdicion }[]> {
  const { bateriaId } = await requireBateria();
  const edicion = await getEdicionHistorial(edicionId);
  if (!edicion) return [];
  const rows = await prisma.ritmistaEdicion.findMany({
    where: { edicionId, edicion: { bateriaId }, ritmista: { bateriaId } },
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

export async function getCajaHistorial(edicionId: string) {
  const edicion = await getEdicionHistorial(edicionId);
  if (!edicion) return null;
  const movimientos = await prisma.cajaMovimiento.findMany({
    where: { edicionId },
    orderBy: { fecha: "asc" },
  });
  const mapped = movimientos.map((m) => {
    const ui = mapCajaMovimiento(m);
    return { id: ui.id, tipo: ui.tipo, categoria: ui.categoria, concepto: ui.concepto, monto: ui.monto, fecha: ui.fechaIso, registradoPor: ui.registradoPor };
  });
  return { anioCarnaval: edicion.anioCarnaval, movimientos: mapped, saldo: saldoCaja(mapped) };
}
