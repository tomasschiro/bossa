export function saldoCaja(movimientos: { tipo: "ingreso" | "egreso"; monto: number }[]): number {
  return movimientos.reduce((sum, m) => sum + (m.tipo === "ingreso" ? m.monto : -m.monto), 0);
}
