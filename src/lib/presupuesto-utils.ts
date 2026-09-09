export function saldoCaja(movimientos: { tipo: "ingreso" | "egreso"; monto: number }[]): number {
  return movimientos.reduce((sum, m) => sum + (m.tipo === "ingreso" ? m.monto : -m.monto), 0);
}

export function desglosePorCategoria(
  movimientos: { tipo: "ingreso" | "egreso"; categoria: string; monto: number }[],
): { categoria: string; saldo: number }[] {
  const map = new Map<string, number>();
  for (const m of movimientos) {
    const delta = m.tipo === "ingreso" ? m.monto : -m.monto;
    map.set(m.categoria, (map.get(m.categoria) ?? 0) + delta);
  }
  return [...map.entries()].map(([categoria, saldo]) => ({ categoria, saldo }));
}

export function estimadoVsGastado(
  estimado: number,
  gastos: { monto: number }[],
): { gastado: number; restante: number } {
  const gastado = gastos.reduce((sum, g) => sum + g.monto, 0);
  return { gastado, restante: estimado - gastado };
}

export function agruparRepuestosPorPrioridad<T extends { prioridad: string | null; costoEstimado: number | null }>(
  items: T[],
): { Urgente: T[]; Deseable: T[] } {
  return {
    Urgente: items.filter((i) => i.prioridad === "Urgente"),
    Deseable: items.filter((i) => i.prioridad === "Deseable"),
  };
}

export function sumCostoEstimado(items: { costoEstimado: number | null }[]): number {
  return items.reduce((sum, i) => sum + (i.costoEstimado ?? 0), 0);
}

export function gananciaNetaBeneficio(ingresoBruto: number, gastos: { monto: number }[]): number {
  return ingresoBruto - gastos.reduce((sum, g) => sum + g.monto, 0);
}

/** Aplica una venta primero contra la deuda del ritmista; el resto es excedente a caja general. */
export function splitVentaRitmista(
  montoVenta: number,
  saldoPendiente: number,
): { aplicadoADeuda: number; excedente: number } {
  const aplicadoADeuda = Math.min(montoVenta, saldoPendiente);
  return { aplicadoADeuda, excedente: montoVenta - aplicadoADeuda };
}

export function calcularSubtotal(costoUnidad: number, cantidad: number): number {
  return costoUnidad * cantidad;
}

export function metricsBeneficios(
  beneficios: { ingresoBruto: number; gananciaNeta: number }[],
): { eventosActivos: number; recaudadoTotal: number; gananciaNetaTotal: number } {
  return {
    eventosActivos: beneficios.length,
    recaudadoTotal: beneficios.reduce((sum, b) => sum + b.ingresoBruto, 0),
    gananciaNetaTotal: beneficios.reduce((sum, b) => sum + b.gananciaNeta, 0),
  };
}

export function metricsBeneficiosDistribuidos(
  tipos: { vendedores: { ventas: { monto: number; montoEnCaja: number | null }[] }[] }[],
): { tiposActivos: number; vendidoTotal: number; aCajaGeneral: number } {
  const ventas = tipos.flatMap((t) => t.vendedores.flatMap((v) => v.ventas));
  return {
    tiposActivos: tipos.length,
    vendidoTotal: ventas.reduce((sum, v) => sum + v.monto, 0),
    aCajaGeneral: ventas.reduce((sum, v) => sum + (v.montoEnCaja ?? 0), 0),
  };
}

export function metricsStock(
  stock: { cantidadPendiente: number }[],
): { tallesConFaltante: number; entregasPendientesTotales: number } {
  return {
    tallesConFaltante: stock.filter((s) => s.cantidadPendiente > 0).length,
    entregasPendientesTotales: stock.reduce((sum, s) => sum + s.cantidadPendiente, 0),
  };
}
