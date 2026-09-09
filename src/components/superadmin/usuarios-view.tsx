"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown } from "lucide-react";
import type { getUsuariosGlobal } from "@/lib/superadmin-actions";

type Usuarios = Awaited<ReturnType<typeof getUsuariosGlobal>>;
const ROL_LABEL: Record<string, string> = { director: "Director", admin: "Administrador" };

interface Grupo {
  bateriaId: string | null;
  bateria: string;
  usuarios: { id: string; nombre: string; email: string; esSuperAdmin: boolean; rol: string | null }[];
}

function agruparPorBateria(usuarios: Usuarios): Grupo[] {
  const grupos = new Map<string, Grupo>();
  const sinBateria: Grupo = { bateriaId: null, bateria: "Sin batería", usuarios: [] };
  for (const u of usuarios) {
    if (u.membresias.length === 0) {
      sinBateria.usuarios.push({ id: u.id, nombre: u.nombre, email: u.email, esSuperAdmin: u.esSuperAdmin, rol: null });
      continue;
    }
    for (const m of u.membresias) {
      const grupo = grupos.get(m.bateriaId) ?? { bateriaId: m.bateriaId, bateria: m.bateria, usuarios: [] };
      grupo.usuarios.push({ id: u.id, nombre: u.nombre, email: u.email, esSuperAdmin: u.esSuperAdmin, rol: m.rol });
      grupos.set(m.bateriaId, grupo);
    }
  }
  const ordenados = [...grupos.values()].sort((a, b) => a.bateria.localeCompare(b.bateria, "es"));
  return sinBateria.usuarios.length ? [...ordenados, sinBateria] : ordenados;
}

function GrupoBateria({ grupo, defaultOpen }: { grupo: Grupo; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 p-4 text-left text-sm font-semibold transition-colors hover:bg-bg-subtle/40 sm:p-5"
        >
          <Building2 className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">
            {grupo.bateriaId ? (
              <Link href={`/superadmin/baterias/${grupo.bateriaId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{grupo.bateria}</Link>
            ) : grupo.bateria}
            <span className="ml-1.5 font-normal text-fg-secondary">({grupo.usuarios.length})</span>
          </span>
          <ChevronDown className={`size-4 shrink-0 text-fg-tertiary transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      <ul id={id} hidden={!open} className="space-y-2 border-t border-border px-4 py-4 sm:px-5">
        {grupo.usuarios.map((u) => (
          <li key={`${grupo.bateriaId}-${u.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg-subtle/60 px-3 py-2 text-sm">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate font-semibold">{u.nombre}</span>
              <span className="truncate text-fg-secondary">{u.email}</span>
              {u.esSuperAdmin && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Superadmin</span>}
            </div>
            {u.rol && <span className="shrink-0 text-fg-secondary">{ROL_LABEL[u.rol] ?? u.rol}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function UsuariosView({ usuarios }: { usuarios: Usuarios }) {
  const grupos = agruparPorBateria(usuarios);
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      <header className="pb-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Usuarios</h1>
        <p className="text-sm text-fg-secondary">Todos los usuarios del sistema, agrupados por batería.</p>
      </header>

      <div className="space-y-3">
        {grupos.map((g, i) => <GrupoBateria key={g.bateriaId ?? "sin-bateria"} grupo={g} defaultOpen={i === 0} />)}
        {grupos.length === 0 && <p className="text-sm text-fg-secondary">No hay usuarios.</p>}
      </div>
    </div>
  );
}
