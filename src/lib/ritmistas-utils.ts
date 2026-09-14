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


export function formatMoney(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

/** DNI argentino: agrupa de a 3 dígitos desde la derecha, ej. "94086614" → "94.086.614". */
export function formatDni(value: string): string {
  const digitos = value.replace(/\D/g, "").slice(0, 8);
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Teléfono: código de área (4 dígitos) + guion + resto, ej. "3772441826" → "3772-441826". */
export function formatTelefono(value: string): string {
  const digitos = value.replace(/\D/g, "").slice(0, 12);
  if (digitos.length <= 4) return digitos;
  return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
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
    ["Tamborim", "Tamborines"],
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
    Tamborines: "TB",
    Chocalho: "CH",
    Frigideiras: "FR",
    Cuicas: "CU",
  };
  return abbr[naipeGroupOf(naipe)] ?? "RT";
}

export function totalMovimientos(re: RitmistaEdicion): number {
  return re.movimientos.reduce((sum, m) => sum + m.monto, 0);
}

/** "rifa" cuenta como pago: una venta de beneficio distribuido aplicada a la deuda del ritmista. */
export function pagadoMovimientos(re: RitmistaEdicion): number {
  return re.movimientos
    .filter((m) => m.tipo === "pago" || m.tipo === "rifa")
    .reduce((sum, m) => sum + m.monto, 0);
}

export function saldoPendiente(re: RitmistaEdicion): number {
  const total = re.movimientos
    .filter((m) => m.tipo !== "pago" && m.tipo !== "rifa")
    .reduce((sum, m) => sum + m.monto, 0);
  const pagado = pagadoMovimientos(re);
  return Math.max(total - pagado, 0);
}

export function totalDeuda(re: RitmistaEdicion): number {
  const total = re.movimientos
    .filter((m) => m.tipo !== "pago" && m.tipo !== "rifa")
    .reduce((sum, m) => sum + m.monto, 0);
  return total;
}

export function entregaCompleta(re: RitmistaEdicion): boolean {
  return re.entregas.length > 0 && re.entregas.every((e) => e.estado === "Entregado");
}

export function naipeHistoryLabel(historial: Ritmista["historial"]): string {
  return historial
    .map((h) => `${h.naipe} (${h.periodo})`)
    .join(" → ");
}

export const ALL_NAIPES = NAIPES;
