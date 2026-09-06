export const AGENDA_TIPOS = { ensayo: "Ensayo", beneficio: "Beneficio", presentacion: "Presentación", fechaClave: "Fecha clave" } as const;
export type EventoTipo = keyof typeof AGENDA_TIPOS;
export type EventoAgenda = { nocheCarnaval?: boolean; id: string; edicionId: string; titulo: string; tipo: EventoTipo; fecha: string; hora: string | null; lugar: string | null; descripcion: string | null; recordarDiasAntes: number; cancelado: boolean; registradoPor: string | null; actualizadoPor: string | null };
export type CumpleRitmista = { id: string; nombre: string; nacimiento: string };
export type Recordatorio = { id: string; titulo: string; fecha: string; tipo: EventoTipo | "cumple"; detalle: string; dias: number };
export function hoyArgentina(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function fechaValida(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > "2200-12-31") return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function diasEntre(desde: string, hasta: string) { return Math.round((Date.parse(hasta + "T00:00:00Z") - Date.parse(desde + "T00:00:00Z")) / 86400000); }
export function fechaCumple(nacimiento: string, year: number) {
  const fecha = `${year}-${nacimiento.slice(5, 10)}`;
  return fechaValida(fecha) ? fecha : `${year}-02-28`; // Feb 29 in a non-leap year.
}
export function cumpleEnAnio(r: CumpleRitmista, year: number): Recordatorio | null {
  const edad = year - Number(r.nacimiento.slice(0, 4));
  if (edad < 1) return null;
  return { id: `cumple-${r.id}-${year}`, titulo: r.nombre, fecha: fechaCumple(r.nacimiento, year), tipo: "cumple", detalle: `Cumple ${edad} años`, dias: 0 };
}
export function recordatorios(eventos: EventoAgenda[], ritmistas: CumpleRitmista[], hoy: string): Recordatorio[] {
  const alerts: Recordatorio[] = eventos.filter((e) => !e.cancelado).flatMap((e) => {
    const dias = diasEntre(hoy, e.fecha);
    return dias >= 0 && dias <= e.recordarDiasAntes ? [{ id: e.id, titulo: e.titulo || AGENDA_TIPOS[e.tipo], fecha: e.fecha, tipo: e.tipo, detalle: [e.hora, e.lugar].filter(Boolean).join(" · "), dias }] : [];
  });
  const year = Number(hoy.slice(0, 4));
  for (const r of ritmistas) {
    let cumple = cumpleEnAnio(r, year);
    if (!cumple || cumple.fecha < hoy) cumple = cumpleEnAnio(r, year + 1);
    if (cumple) { const dias = diasEntre(hoy, cumple.fecha); if (dias >= 0 && dias <= 7) alerts.push({ ...cumple, dias }); }
  }
  return alerts.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.titulo.localeCompare(b.titulo));
}
export function etiquetaDias(dias: number) { return dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias} días`; }
export function fechaCorta(fecha: string) { return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(fecha + "T12:00:00Z")); }
