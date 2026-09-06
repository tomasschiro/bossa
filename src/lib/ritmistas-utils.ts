import type { Naipe, Ritmista, RitmistaEdicion } from "./types";
import { NAIPES } from "./types";

export function calcAge(isoDate: string): number {
  const b = new Date(isoDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
  ) {
    age--;
  }
  return age;
}

/** Antigüedad = ediciones desde la primera edición registrada en el historial. No editable, calculado. */
export function calcAntiguedad(ritmista: Ritmista, edicionActual: number): number {
  if (ritmista.historial.length === 0) return 0;
  const primerAnio = Math.min(...ritmista.historial.map((h) => h.desde));
  return Math.max(edicionActual - primerAnio + 1, 0);
}

export function formatMoney(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR");
}

export function initials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

export function fullName(r: Ritmista): string {
  return `${r.nombre} ${r.apellido}`;
}

/** Deriva el grupo de naipe (ej: "Caixa 14\"" -> "Caixas") a partir del naipe tocado en una edición */
export function naipeGroupOf(naipe: string): Naipe {
  const map: [string, Naipe][] = [
    ["Caixa", "Caixas"],
    ["Repique", "Repiques"],
    ["Surdo", "Surdos"],
    ["Tamborim", "Tamborins"],
    ["Chocalho", "Chocalho"],
    ["Frigideira", "Frigideiras"],
    ["Cuica", "Cuicas"],
  ];
  const found = map.find(([prefix]) => naipe.startsWith(prefix));
  return found ? found[1] : (naipe as Naipe);
}

export function naipeAbbr(naipe: string): string {
  const abbr: Record<Naipe, string> = {
    Caixas: "CX",
    Repiques: "RP",
    Surdos: "SD",
    Tamborins: "TB",
    Chocalho: "CH",
    Frigideiras: "FR",
    Cuicas: "CU",
  };
  return abbr[naipeGroupOf(naipe)] ?? "RT";
}

export function totalMovimientos(re: RitmistaEdicion): number {
  return re.movimientos.reduce((sum, m) => sum + m.monto, 0);
}

export function pagadoMovimientos(re: RitmistaEdicion): number {
  return re.movimientos
    .filter((m) => m.tipo === "pago")
    .reduce((sum, m) => sum + m.monto, 0);
}

export function saldoPendiente(re: RitmistaEdicion): number {
  const total = re.movimientos
    .filter((m) => m.tipo !== "pago")
    .reduce((sum, m) => sum + m.monto, 0);
  const pagado = pagadoMovimientos(re);
  return Math.max(total - pagado, 0);
}

export function totalDeuda(re: RitmistaEdicion): number {
  const total = re.movimientos
    .filter((m) => m.tipo !== "pago")
    .reduce((sum, m) => sum + m.monto, 0);
  return total;
}

export function entregaCompleta(re: RitmistaEdicion): boolean {
  return re.entregas.length > 0 && re.entregas.every((e) => e.estado === "Entregado");
}

export function historialTexto(historial: Ritmista["historial"]): string {
  if (historial.length === 0) return "Sin historial registrado.";
  return (
    historial
      .map((h) => {
        const [from, to] = h.periodo.split("–");
        return to ? `De ${from} a ${to} tocó ${h.naipe}` : `En ${from} tocó ${h.naipe}`;
      })
      .join(". ") + "."
  );
}

export function naipeHistoryLabel(historial: Ritmista["historial"]): string {
  return historial
    .map((h) => `${h.naipe} (${h.periodo})`)
    .join(" → ");
}

export const ALL_NAIPES = NAIPES;
