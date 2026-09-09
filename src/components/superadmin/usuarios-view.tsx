"use client";
import { useId, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { editarUsuarioSuperAdmin, resetPasswordUsuarioSuperAdmin, type getUsuariosGlobal } from "@/lib/superadmin-actions";

type Usuarios = Awaited<ReturnType<typeof getUsuariosGlobal>>;
const ROL_LABEL: Record<string, string> = { director: "Director", admin: "Administrador" };
const label = "mb-1.5 block text-sm font-medium";

function Notice({ value }: { value?: { error?: string; success?: string } }) {
  return value?.error ? <p role="alert" className="text-sm text-danger">{value.error}</p> : value?.success ? <p role="status" className="text-sm text-success">{value.success}</p> : null;
}

interface UsuarioRow { id: string; nombre: string; email: string; esSuperAdmin: boolean; rol: string | null }
interface Grupo {
  bateriaId: string | null;
  bateria: string;
  usuarios: UsuarioRow[];
}

function EditarUsuarioForm({ usuario, onDone }: { usuario: UsuarioRow; onDone: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [email, setEmail] = useState(usuario.email);
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();
  const uid = useId();

  function guardar(e: FormEvent) {
    e.preventDefault();
    setNotice({});
    startTransition(async () => {
      try {
        if (nombre !== usuario.nombre || email.trim().toLowerCase() !== usuario.email) {
          const r = await editarUsuarioSuperAdmin({ usuarioId: usuario.id, nombre, email });
          if ("error" in r) { setNotice({ error: r.error }); return; }
        }
        if (password) {
          const r = await resetPasswordUsuarioSuperAdmin({ usuarioId: usuario.id, password });
          if ("error" in r) { setNotice({ error: r.error }); return; }
        }
        setNotice({ success: "Cambios guardados." });
        setPassword("");
        router.refresh();
        onDone();
      } catch {
        setNotice({ error: "No se pudo guardar. Intentá nuevamente." });
      }
    });
  }

  return (
    <form aria-label={`Editar ${usuario.nombre}`} className="mt-2 space-y-4 rounded-xl border border-border bg-card p-4" onSubmit={guardar}>
      <div><label htmlFor={`${uid}-nombre`} className={label}>Nombre</label><Input id={`${uid}-nombre`} maxLength={100} required value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
      <div><label htmlFor={`${uid}-email`} className={label}>Email</label><Input id={`${uid}-email`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label htmlFor={`${uid}-password`} className={label}>Nueva contraseña (dejar vacío para no cambiar)</label><PasswordInput id={`${uid}-password`} autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Notice value={notice} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>Guardar</Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
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

function GrupoBateria({ grupo, defaultOpen, editingId, onToggleEdit }: { grupo: Grupo; defaultOpen: boolean; editingId: string | null; onToggleEdit: (id: string) => void }) {
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
          <li key={`${grupo.bateriaId}-${u.id}`} className="rounded-xl bg-bg-subtle/60 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate font-semibold">{u.nombre}</span>
                <span className="truncate text-fg-secondary">{u.email}</span>
                {u.esSuperAdmin && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Superadmin</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {u.rol && <span className="text-fg-secondary">{ROL_LABEL[u.rol] ?? u.rol}</span>}
                <button
                  type="button"
                  onClick={() => onToggleEdit(u.id)}
                  aria-expanded={editingId === u.id}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-fg-secondary hover:bg-bg-subtle hover:text-foreground"
                >
                  <Pencil className="size-3.5" />Editar
                </button>
              </div>
            </div>
            {editingId === u.id && <EditarUsuarioForm usuario={u} onDone={() => onToggleEdit(u.id)} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function UsuariosView({ usuarios }: { usuarios: Usuarios }) {
  const grupos = agruparPorBateria(usuarios);
  const [editingId, setEditingId] = useState<string | null>(null);
  const toggleEdit = (uid: string) => setEditingId((cur) => (cur === uid ? null : uid));
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      <header className="pb-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Usuarios</h1>
        <p className="text-sm text-fg-secondary">Todos los usuarios del sistema, agrupados por batería.</p>
      </header>

      <div className="space-y-3">
        {grupos.map((g, i) => <GrupoBateria key={g.bateriaId ?? "sin-bateria"} grupo={g} defaultOpen={i === 0} editingId={editingId} onToggleEdit={toggleEdit} />)}
        {grupos.length === 0 && <p className="text-sm text-fg-secondary">No hay usuarios.</p>}
      </div>
    </div>
  );
}
