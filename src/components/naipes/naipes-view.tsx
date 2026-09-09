"use client";
import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Pencil, Plus, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { guardarNaipe, moverNaipe, guardarVariante, eliminarVariante } from "@/lib/naipes-actions";

type Variante = { id: string; nombre: string };
type Row = { id: string; nombre: string; cantidad: number; variantes: Variante[] };
export function NaipesView({ naipes }: { naipes: Row[] }) {
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [expandido, setExpandido] = useState<string | null>(null);
  const [nuevaVariante, setNuevaVariante] = useState("");
  const [varianteError, setVarianteError] = useState("");
  function edit(row: Row | null) { setEditing(row); setNombre(row?.nombre ?? ""); setError(""); }
  function move(row: Row, direccion: "arriba" | "abajo") {
    setError("");
    startTransition(async () => { try { await moverNaipe({ id: row.id, direccion }); } catch { setError("No se pudo cambiar el orden. Intentá nuevamente."); } });
  }
  function toggleExpandido(id: string) { setExpandido(expandido === id ? null : id); setNuevaVariante(""); setVarianteError(""); }
  function agregarVariante(naipeId: string) {
    setVarianteError("");
    startTransition(async () => {
      try { const result = await guardarVariante({ naipeId, nombre: nuevaVariante }); if (result.error) setVarianteError(result.error); else setNuevaVariante(""); }
      catch { setVarianteError("No se pudo guardar la variante. Intentá nuevamente."); }
    });
  }
  function quitarVariante(naipeId: string, varianteId: string) {
    setVarianteError("");
    startTransition(async () => { try { await eliminarVariante({ id: varianteId, naipeId }); } catch { setVarianteError("No se pudo eliminar la variante. Intentá nuevamente."); } });
  }
  return <div>
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div><h1 className="text-2xl font-extrabold tracking-tight">Naipes</h1><p className="text-[13px] text-fg-secondary">Los instrumentos que organizan tu batería</p></div>
      <Button onClick={() => edit(null)}><Plus className="size-4" />Agregar naipe</Button>
    </header>
    {error && editing === undefined && <p role="alert" className="mb-4 text-danger">{error}</p>}
    {naipes.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center"><h2 className="font-semibold">Todavía no hay naipes</h2><p className="mt-2 text-sm text-fg-secondary">Agregá el primer instrumento de tu batería para organizar a tus ritmistas.</p></div> :
      <ul className="max-w-3xl space-y-3">{naipes.map((row, index) => <li key={row.id} className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{String(index + 1).padStart(2, "0")}</span>
          <button type="button" aria-expanded={expandido === row.id} aria-label={expandido === row.id ? `Ocultar variantes de ${row.nombre}` : `Ver variantes de ${row.nombre}`} disabled={pending} onClick={() => toggleExpandido(row.id)} className="flex min-w-0 flex-1 items-center gap-1.5 rounded text-left hover:text-primary disabled:pointer-events-none">
            <ChevronDown className={`size-4 shrink-0 text-fg-tertiary transition-transform ${expandido === row.id ? "rotate-180" : ""}`} />
            <span className="min-w-0"><h2 className="break-words font-semibold">{row.nombre}</h2><p className="text-xs font-normal text-fg-secondary">{row.cantidad} {row.cantidad === 1 ? "ritmista en el padrón" : "ritmistas en el padrón"}{row.variantes.length > 0 ? ` · ${row.variantes.length} variante${row.variantes.length === 1 ? "" : "s"}` : ""}</p></span>
          </button>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" aria-label={`Subir ${row.nombre}`} disabled={pending || index === 0} onClick={() => move(row, "arriba")}><ArrowUp className="size-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={`Bajar ${row.nombre}`} disabled={pending || index === naipes.length - 1} onClick={() => move(row, "abajo")}><ArrowDown className="size-4" /></Button>
            <Button size="icon" variant="outline" aria-label={`Editar ${row.nombre}`} disabled={pending} onClick={() => edit(row)}><Pencil className="size-4" /></Button>
          </div>
        </div>
        {expandido === row.id && <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold">Variantes de {row.nombre}</p>
          {row.variantes.length > 0 && <ul className="flex flex-wrap gap-1.5">{row.variantes.map(v => <li key={v.id} className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">{v.nombre}<button type="button" aria-label={`Eliminar variante ${v.nombre} de ${row.nombre}`} disabled={pending} onClick={() => quitarVariante(row.id, v.id)} className="text-fg-tertiary hover:text-danger"><Trash2 className="size-3" /></button></li>)}</ul>}
          {row.variantes.length === 0 && <p className="text-xs text-fg-tertiary">Sin variantes cargadas. Se pinta directo con el naipe general en Formación.</p>}
          <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); if (nuevaVariante.trim()) agregarVariante(row.id); }}>
            <Input aria-label={`Nueva variante de ${row.nombre}`} className="h-8 w-40 text-xs" maxLength={30} placeholder='Ej. 12"' value={nuevaVariante} onChange={e => setNuevaVariante(e.target.value)} disabled={pending} />
            <Button type="submit" size="sm" className="h-8 text-xs" disabled={pending || !nuevaVariante.trim()}>Agregar</Button>
          </form>
          {varianteError && <p role="alert" className="text-xs text-danger">{varianteError}</p>}
        </div>}
      </li>)}</ul>}
    <p className="mt-4 max-w-3xl text-xs text-fg-secondary">El orden se usa en los selectores de ritmistas. Los cambios de nombre actualizan el padrón y conservan los nombres del historial de Carnaval. Las variantes se usan para desglosar el Objetivo en Ecualización y para pintar en Formación.</p>
    <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open && !pending) setEditing(undefined); }}>
      <DialogContent><DialogHeader><DialogTitle>{editing ? "Editar naipe" : "Agregar naipe"}</DialogTitle><DialogDescription>Definí el nombre del instrumento para tu batería.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setError(""); startTransition(async () => {
          try { const result = await guardarNaipe({ id: editing?.id, nombre }); if (result.error) { setError(result.error); return; } setEditing(undefined); }
          catch { setError("No se pudo guardar el naipe. Intentá nuevamente."); }
        }); }}>
          <label htmlFor="naipe-nombre" className="text-sm font-medium">Nombre</label><Input id="naipe-nombre" autoFocus maxLength={60} required value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej. Agogôs" />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(undefined)}>Cancelar</Button><Button type="submit" disabled={pending || !nombre.trim()}>{pending ? "Guardando…" : "Guardar"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
