"use client";
import { useState, useTransition } from "react";
import { Bell, Cake, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { guardarEvento, cancelarEvento, type getAgenda } from "@/lib/agenda-actions";
import { AGENDA_TIPOS, cumpleEnAnio, etiquetaDias, fechaCorta, recordatorios, type EventoAgenda, type EventoTipo } from "@/lib/agenda-utils";

type Data = Awaited<ReturnType<typeof getAgenda>>;
const colors = { ensayo: "bg-primary/10 text-primary", beneficio: "bg-info/10 text-info", presentacion: "bg-success/10 text-success", fechaClave: "bg-warning/10 text-warning", cumple: "bg-accent/15 text-foreground" };
const selectClass = "h-10 max-w-full rounded-lg border border-border bg-card px-3 text-sm";
const empty = (edicionId: string, fecha: string) => ({ edicionId, titulo: "", tipo: "ensayo" as EventoTipo, fecha, hora: "", lugar: "", descripcion: "", recordarDiasAntes: 1 });
export function AgendaView({ data }: { data: Data }) {
  const [month, setMonth] = useState(data.hoy.slice(0, 7));
  const [view, setView] = useState<"calendario" | "lista">("calendario");
  const [filter, setFilter] = useState("todos");
  const [day, setDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<EventoAgenda | null | undefined>(undefined);
  const [draft, setDraft] = useState(empty(data.edicion?.id ?? "", data.hoy));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [year, m] = month.split("-").map(Number);
  const birthdays = data.ritmistas.flatMap((r) => { const b = cumpleEnAnio(r, year); return b ? [b] : []; });
  const alerts = recordatorios(data.edicion?.activa ? data.eventos : [], data.ritmistas, data.hoy);
  const items = [
    ...data.eventos.map((e) => ({ id: e.id, fecha: e.fecha, titulo: e.titulo || AGENDA_TIPOS[e.tipo], tipo: e.tipo, detalle: [e.hora, e.lugar].filter(Boolean).join(" · "), cancelado: e.cancelado, evento: e.nocheCarnaval ? null : e })),
    ...birthdays.map((b) => ({ ...b, cancelado: false, evento: null })),
  ].filter((i) => i.fecha.startsWith(month) && (filter === "todos" || i.tipo === filter)).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.detalle.localeCompare(b.detalle));
  const visibleItems = items.filter((i) => !day || view === "lista" || i.fecha === day);
  const first = new Date(Date.UTC(year, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const title = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  function navigate(delta: number) { const d = new Date(Date.UTC(year, m - 1 + delta, 1)); setMonth(d.toISOString().slice(0, 7)); setDay(null); }
  function open(evento: EventoAgenda | null, fecha = day ?? data.hoy) {
    setError(""); setEditing(evento);
    setDraft(evento ? { edicionId: evento.edicionId, titulo: evento.titulo, tipo: evento.tipo, fecha: evento.fecha, hora: evento.hora ?? "", lugar: evento.lugar ?? "", descripcion: evento.descripcion ?? "", recordarDiasAntes: evento.recordarDiasAntes } : empty(data.edicion?.id ?? "", fecha));
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div><h1 className="text-2xl font-extrabold tracking-tight">Agenda</h1><p className="text-[13px] text-fg-secondary">Ensayos, fechas clave y cumpleaños de tu batería</p></div>
      <div className="flex flex-wrap gap-2">
        {data.edicion?.activa && <Button onClick={() => open(null)}><Plus className="size-4" />Nuevo evento</Button>}
      </div>
    </header>
    {!data.edicion && <p className="rounded-xl border border-border p-4 text-sm">Tu batería todavía no tiene una edición. Los cumpleaños ya están disponibles; para cargar eventos necesitás una edición activa.</p>}
    {data.edicion && !data.edicion.activa && <p className="text-sm text-fg-secondary">Edición en modo consulta. Los cumpleaños corresponden al padrón actual.</p>}
    <section aria-label="Recordatorios" className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Bell className="size-4 text-primary" />Para tener presente <span className="text-sm font-normal text-fg-secondary">({alerts.length})</span></h2>
      <p className="mt-1 text-xs text-fg-secondary">Cumpleaños: próximos 7 días. Eventos: según la anticipación elegida. Avisos dentro de Bossa.</p>
      {alerts.length ? <ul className="mt-4 grid gap-2 lg:grid-cols-2">{alerts.map((a) => <li key={a.id}><button className="flex w-full items-center gap-3 rounded-xl bg-bg-subtle p-3 text-left hover:bg-primary/5" onClick={() => { setMonth(a.fecha.slice(0, 7)); setDay(a.fecha); setView("calendario"); setFilter("todos"); }}>
        {a.tipo === "cumple" ? <Cake className="size-4 shrink-0 text-warning" /> : <Bell className="size-4 shrink-0 text-primary" />}<span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{a.titulo}</span><span className="block text-xs text-fg-secondary">{fechaCorta(a.fecha)}{a.detalle ? ` · ${a.detalle}` : ""}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${a.dias === 0 ? "bg-primary text-white" : "bg-card text-fg-secondary"}`}>{etiquetaDias(a.dias)}</span>
      </button></li>)}</ul> : <p className="mt-3 text-sm text-fg-secondary">No hay recordatorios próximos.</p>}
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1"><Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => navigate(-1)}><ChevronLeft className="size-4" /></Button><h2 className="min-w-36 text-center text-sm font-semibold capitalize">{title}</h2><Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => navigate(1)}><ChevronRight className="size-4" /></Button><Button variant="ghost" onClick={() => { setMonth(data.hoy.slice(0, 7)); setDay(data.hoy); }}>Hoy</Button></div>
      <div className="flex flex-wrap gap-2"><label htmlFor="agenda-filtro" className="sr-only">Filtrar agenda</label><select id="agenda-filtro" value={filter} className={selectClass} onChange={(e) => setFilter(e.target.value)}><option value="todos">Todos</option>{Object.entries(AGENDA_TIPOS).map(([value, name]) => <option key={value} value={value}>{name}</option>)}<option value="cumple">Cumpleaños</option></select><div className="flex rounded-lg bg-bg-subtle p-1">{(["calendario", "lista"] as const).map((v) => <button key={v} onClick={() => { setView(v); setDay(null); }} aria-pressed={view === v} className={`rounded-md px-3 py-1 text-sm capitalize ${view === v ? "bg-card shadow-sm" : "text-fg-secondary"}`}>{v}</button>)}</div></div>
    </div>
    {view === "calendario" && <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 bg-bg-subtle text-center text-xs text-fg-secondary">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <div className="p-2" key={d}>{d}</div>)}</div>
      <div className="grid grid-cols-7">{Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
        const n = index - offset + 1; if (n < 1 || n > days) return <div key={index} className="min-h-20 border-t border-r border-border bg-bg-subtle/30 md:min-h-28" />;
        const date = `${month}-${String(n).padStart(2, "0")}`; const entries = items.filter((i) => i.fecha === date && !i.cancelado);
        return <button key={index} aria-label={`${date}, ${entries.length} actividades`} aria-pressed={day === date} onClick={() => setDay(day === date ? null : date)} className={`flex min-w-0 min-h-20 flex-col items-start border-t border-r border-border p-1 text-left align-top hover:bg-bg-subtle md:min-h-28 md:p-2 ${day === date ? "bg-primary/10" : ""}`}>
          <span className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs ${date === data.hoy ? "bg-primary font-semibold text-white" : ""}`}>{n}</span>
          {entries.slice(0, 2).map((e) => <span key={e.id} className={`mb-1 block max-w-full truncate rounded px-1 text-[10px] leading-5 md:text-xs ${colors[e.tipo]}`}>{e.tipo === "cumple" ? "🎂 " : ""}{e.titulo}</span>)}{entries.length > 2 && <span className="text-[10px] text-fg-secondary">+{entries.length - 2} más</span>}
        </button>;
      })}</div>
    </div>}
    <section aria-label="Actividades">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{day && view === "calendario" ? `Actividades del ${fechaCorta(day)}` : "Actividades del mes"}</h2>{day && view === "calendario" && <Button variant="ghost" onClick={() => setDay(null)}>Ver todo el mes</Button>}</div>
      {visibleItems.length ? <ul className="space-y-2">{visibleItems.map((i) => <li key={i.id} className={`flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4 ${i.cancelado ? "opacity-60" : ""}`}>
        <div className="min-w-0 flex-1"><span className={`inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${colors[i.tipo]}`}>{i.tipo === "cumple" ? "Cumpleaños" : AGENDA_TIPOS[i.tipo]}{i.cancelado ? " · Cancelado" : ""}</span><h3 className="mt-2 break-words font-semibold">{i.titulo}</h3><p className="mt-1 text-sm text-fg-secondary">{fechaCorta(i.fecha)}{i.detalle ? ` · ${i.detalle}` : ""}</p>{i.evento?.descripcion && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-fg-secondary">{i.evento.descripcion}</p>}{i.evento?.registradoPor && <p className="mt-2 text-xs text-fg-tertiary">Registrado por {i.evento.registradoPor}{i.evento.actualizadoPor && i.evento.actualizadoPor !== i.evento.registradoPor ? ` · Actualizado por ${i.evento.actualizadoPor}` : ""}</p>}</div>
        {i.evento && data.edicion?.activa && <div className="flex gap-1"><Button variant="outline" disabled={pending} onClick={() => open(i.evento)}>Editar</Button><Button variant="ghost" disabled={pending} onClick={() => { setError(""); startTransition(async () => { try { await cancelarEvento(i.id); } catch { setError("No se pudo cambiar el evento. Intentá nuevamente."); } }); }}>{i.cancelado ? "Restaurar" : "Cancelar evento"}</Button></div>}
      </li>)}</ul> : <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-secondary">No hay actividades para esta selección.</div>}
      {error && editing === undefined && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </section>
    <p className="text-xs text-fg-tertiary">Fechas y horarios de Argentina. Cumpleaños del padrón completo; los nacidos el 29/2 se recuerdan el 28/2 en años no bisiestos.</p>
    <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open && !pending) setEditing(undefined); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Editar evento" : "Nuevo evento"}</DialogTitle><DialogDescription>Cargá una actividad o una fecha clave y elegí cuándo recordarla.</DialogDescription></DialogHeader>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setError(""); startTransition(async () => { try { const result = await guardarEvento({ ...draft, id: editing?.id }); if (result.error) { setError(result.error); return; } setMonth(draft.fecha.slice(0, 7)); setDay(null); setFilter("todos"); setEditing(undefined); } catch { setError("No se pudo guardar. Verificá que la edición siga activa e intentá nuevamente."); } }); }}>
        <div className="space-y-1"><label htmlFor="evento-titulo" className="text-sm font-medium">Título</label><Input id="evento-titulo" required maxLength={120} value={draft.titulo} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} placeholder="Ej. Fecha límite para pagar el traje" /></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label htmlFor="evento-tipo" className="block text-sm font-medium">Tipo</label><select id="evento-tipo" className={`${selectClass} w-full`} value={draft.tipo} onChange={(e) => setDraft({ ...draft, tipo: e.target.value as EventoTipo, recordarDiasAntes: e.target.value === "fechaClave" ? 7 : 1 })}>{Object.entries(AGENDA_TIPOS).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></div><div className="space-y-1"><label htmlFor="evento-aviso" className="block text-sm font-medium">Recordarme</label><select id="evento-aviso" className={`${selectClass} w-full`} value={draft.recordarDiasAntes} onChange={(e) => setDraft({ ...draft, recordarDiasAntes: Number(e.target.value) })}>{[0, 1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d === 0 ? "El mismo día" : `${d} ${d === 1 ? "día antes" : "días antes"}`}</option>)}</select></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label htmlFor="evento-fecha" className="text-sm font-medium">Fecha</label><Input id="evento-fecha" type="date" required min="1900-01-01" max="2200-12-31" value={draft.fecha} onChange={(e) => setDraft({ ...draft, fecha: e.target.value })} /></div><div><label htmlFor="evento-hora" className="text-sm font-medium">Hora (opcional)</label><Input id="evento-hora" type="time" value={draft.hora} onChange={(e) => setDraft({ ...draft, hora: e.target.value })} /></div></div>
        <div><label htmlFor="evento-lugar" className="text-sm font-medium">Lugar (opcional)</label><Input id="evento-lugar" maxLength={200} value={draft.lugar} onChange={(e) => setDraft({ ...draft, lugar: e.target.value })} /></div>
        <div><label htmlFor="evento-descripcion" className="text-sm font-medium">Descripción (opcional)</label><textarea id="evento-descripcion" className="min-h-20 w-full rounded-lg border border-border bg-card p-2 text-sm" maxLength={2000} value={draft.descripcion} onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })} /></div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(undefined)}>Volver</Button><Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar evento"}</Button></div>
      </form>
    </DialogContent></Dialog>
  </div>;
}
