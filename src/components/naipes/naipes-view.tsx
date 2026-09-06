"use client";
import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { guardarNaipe, moverNaipe } from "@/lib/naipes-actions";

type Row = { id: string; nombre: string; cantidad: number };
export function NaipesView({ naipes }: { naipes: Row[] }) {
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function edit(row: Row | null) { setEditing(row); setNombre(row?.nombre ?? ""); setError(""); }
  function move(row: Row, direccion: "arriba" | "abajo") {
    setError("");
    startTransition(async () => { try { await moverNaipe({ id: row.id, direccion }); } catch { setError("No se pudo cambiar el orden. Intentá nuevamente."); } });
  }
  return <div>
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div><h1 className="text-2xl font-extrabold tracking-tight">Naipes</h1><p className="text-[13px] text-fg-secondary">Los instrumentos que organizan tu batería</p></div>
      <Button onClick={() => edit(null)}><Plus className="size-4" />Agregar naipe</Button>
    </header>
    {error && editing === undefined && <p role="alert" className="mb-4 text-danger">{error}</p>}
    {naipes.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center"><h2 className="font-semibold">Todavía no hay naipes</h2><p className="mt-2 text-sm text-fg-secondary">Agregá el primer instrumento de tu batería para organizar a tus ritmistas.</p></div> :
      <ul className="max-w-3xl space-y-3">{naipes.map((row, index) => <li key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{row.nombre}</h2><p className="text-xs text-fg-secondary">{row.cantidad} {row.cantidad === 1 ? "ritmista en el padrón" : "ritmistas en el padrón"}</p></div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" aria-label={`Subir ${row.nombre}`} disabled={pending || index === 0} onClick={() => move(row, "arriba")}><ArrowUp className="size-4" /></Button>
          <Button size="icon" variant="ghost" aria-label={`Bajar ${row.nombre}`} disabled={pending || index === naipes.length - 1} onClick={() => move(row, "abajo")}><ArrowDown className="size-4" /></Button>
          <Button size="icon" variant="outline" aria-label={`Editar ${row.nombre}`} disabled={pending} onClick={() => edit(row)}><Pencil className="size-4" /></Button>
        </div>
      </li>)}</ul>}
    <p className="mt-4 max-w-3xl text-xs text-fg-secondary">El orden se usa en los selectores de ritmistas. Los cambios de nombre actualizan el padrón y conservan los nombres del historial de Carnaval.</p>
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
