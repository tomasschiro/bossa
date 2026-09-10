"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Drum } from "lucide-react";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { RitmistaAvatar } from "@/components/ritmistas/ritmista-avatar";
import { StatusBadge } from "@/components/ritmistas/status-badge";
import { initials } from "@/lib/ritmistas-utils";
import { Input } from "@/components/ui/input";
import type { getPlanNaipes } from "@/lib/naipes-plan-actions";

type Data = Awaited<ReturnType<typeof getPlanNaipes>>;
type Fila = Data["rows"][number];
const norm = (s: string) => s.toLocaleLowerCase("es");

export function NaipeFicha({ row, rows, edicion, confirmados }: { row: Fila; rows: Fila[]; edicion: NonNullable<Data["edicion"]>; confirmados: boolean }) {
  const pathname = usePathname();
  const base = pathname.startsWith("/carnaval/") ? "/carnaval/naipes" : "/naipes";

  const [seleccion, setSeleccion] = useState<Set<string>>(new Set([row.nombre]));
  const [query, setQuery] = useState("");
  const [solo, setSolo] = useState(confirmados);

  const todos = seleccion.size === 0;
  function toggleChip(nombre: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) next.delete(nombre);
      else next.add(nombre);
      return next;
    });
  }

  const filas = useMemo(() => {
    const activos = todos ? rows : rows.filter((r) => seleccion.has(r.nombre));
    const q = norm(query.trim());
    return activos
      .flatMap((r) => r.integrantes.map((i) => ({ ...i, naipeFamilia: r.nombre })))
      .filter((i) => (!solo || i.estado === "Confirmado") && (!q || norm(`${i.nombre} ${i.apellido} ${i.naipe} ${i.naipeFamilia}`).includes(q)))
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"));
  }, [rows, seleccion, todos, query, solo]);

  const tituloNaipe = todos ? "Todos los naipes" : [...seleccion].join(" · ");
  const naipesElegidos = todos ? rows : rows.filter((r) => seleccion.has(r.nombre));
  const totalIntegrantes = naipesElegidos.reduce((n, r) => n + r.actual, 0);
  const totalConfirmados = naipesElegidos.reduce((n, r) => n + r.confirmados, 0);
  const totalObjetivo = naipesElegidos.every((r) => r.plan.objetivo === null) ? "Sin definir" : naipesElegidos.reduce((n, r) => n + (r.plan.objetivo ?? 0), 0);
  const soloUno = naipesElegidos.length === 1 ? naipesElegidos[0] : null;

  return (
    <div className="space-y-4">
      <Link href={`${base}?edicion=${encodeURIComponent(edicion.id)}`} className="inline-flex items-center gap-2 text-xs text-fg-secondary hover:text-primary">
        <ArrowLeft className="size-4" />Volver a naipes
      </Link>

      <header className="flex items-center gap-3 border-b border-border pb-4">
        <span className="rounded-xl bg-primary/10 p-3 text-primary"><Drum className="size-6" /></span>
        <div>
          <p className="text-xs font-semibold text-primary">Carnaval {edicion.anio} · {edicion.abierta ? "En preparación" : "Histórico"}</p>
          <h1 className="text-2xl font-bold tracking-tight">{tituloNaipe}</h1>
          <p className="text-xs text-fg-secondary">Elegí uno o varios naipes con los chips para ver sus integrantes juntos.</p>
        </div>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          aria-pressed={todos}
          onClick={() => setSeleccion(new Set())}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${todos ? "border-primary bg-primary/10 text-primary" : "border-border text-fg-secondary hover:bg-bg-subtle"}`}
        >
          Todos
        </button>
        {rows.map((r) => {
          const activo = seleccion.has(r.nombre);
          return (
            <button
              key={r.nombre}
              type="button"
              aria-pressed={activo}
              onClick={() => toggleChip(r.nombre)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${activo ? "border-primary bg-primary/10 text-primary" : "border-border text-fg-secondary hover:bg-bg-subtle"}`}
            >
              {r.nombre}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-4">
        {[
          ["Integrantes", totalIntegrantes],
          ["Confirmados", totalConfirmados],
          ["Objetivo", totalObjetivo],
          ["Seguimiento", soloUno ? soloUno.plan.estado : `${naipesElegidos.length} naipes`],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-border px-4 py-3 last:border-r-0">
            <p className="text-xs text-fg-secondary">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <h2 className="text-sm font-semibold">Integrantes · {filas.length}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Input className="h-8 w-64 text-xs" aria-label="Buscar integrante" placeholder="Buscar nombre o instrumento…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={solo} onChange={(e) => setSolo(e.target.checked)} />Solo confirmados</label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">N°</TableHead>
                {["Nombre y Apellido", "Instrumento", "Estado", "Nivel", "Teléfono"].map((h) => <TableHead key={h}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((r, i) => (
                <TableRow key={`${r.naipeFamilia}-${r.id}`}>
                  <TableCell className="font-mono-num text-fg-tertiary">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <RitmistaAvatar initials={initials(r.nombre, r.apellido)} />
                      <span className="font-medium text-foreground">{r.nombre} {r.apellido}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-fg-secondary">{r.naipe}</TableCell>
                  <TableCell><StatusBadge estado={r.estado === "Confirmado" ? "Confirmado" : r.estado === "EnDuda" ? "En duda" : "No confirmado"} /></TableCell>
                  <TableCell className="text-fg-secondary">{r.nivel}</TableCell>
                  <TableCell className="font-mono-num text-fg-secondary">{r.telefono || "—"}</TableCell>
                </TableRow>
              ))}
              {!filas.length && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-24 text-center text-fg-secondary">No hay integrantes con los filtros actuales.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
