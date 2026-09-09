"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { guardarBateriaSuperAdmin, crearUsuarioConMembresia, cambiarRolMembresia, quitarAcceso, type getBateriaDetalle } from "@/lib/superadmin-actions";
import type { RolMembresia } from "@prisma/client";

type Bateria = NonNullable<Awaited<ReturnType<typeof getBateriaDetalle>>>;
const ROL_LABEL: Record<string, string> = { director: "Director", admin: "Administrador" };
const label = "mb-1.5 block text-sm font-medium";

function Notice({ value }: { value?: { error?: string; success?: string } }) {
  return value?.error ? <p role="alert" className="text-sm text-danger">{value.error}</p> : value?.success ? <p role="status" className="text-sm text-success">{value.success}</p> : null;
}

export function BateriaDetalleView({ bateria }: { bateria: Bateria }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(bateria.nombre);
  const [comparsa, setComparsa] = useState(bateria.comparsa ?? "");
  const [notices, setNotices] = useState<Record<string, { error?: string; success?: string }>>({});
  const [pending, startTransition] = useTransition();
  const [rowPendingId, setRowPendingId] = useState<string | null>(null);

  const [openNuevo, setOpenNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoPassword, setNuevoPassword] = useState("");
  const [nuevoRol, setNuevoRol] = useState<RolMembresia>("director");

  function notice(key: string, value: { error?: string; success?: string }) { setNotices((prev) => ({ ...prev, [key]: value })); }

  function guardarDatos(e: FormEvent) {
    e.preventDefault();
    notice("datos", {});
    startTransition(async () => {
      try {
        const result = await guardarBateriaSuperAdmin({ bateriaId: bateria.id, nombre, comparsa });
        notice("datos", "error" in result ? { error: result.error } : { success: "Guardado." });
        if (!("error" in result)) router.refresh();
      } catch { notice("datos", { error: "No se pudo guardar. Intentá nuevamente." }); }
    });
  }

  function crearUsuario(e: FormEvent) {
    e.preventDefault();
    notice("nuevo", {});
    startTransition(async () => {
      try {
        const result = await crearUsuarioConMembresia({ nombre: nuevoNombre, email: nuevoEmail, password: nuevoPassword, bateriaId: bateria.id, rol: nuevoRol });
        if ("error" in result) { notice("nuevo", { error: result.error }); return; }
        setNuevoNombre(""); setNuevoEmail(""); setNuevoPassword(""); setOpenNuevo(false);
        router.refresh();
      } catch { notice("nuevo", { error: "No se pudo crear el usuario. Intentá nuevamente." }); }
    });
  }

  function cambiarRol(membresiaId: string, rol: RolMembresia) {
    setRowPendingId(membresiaId);
    startTransition(async () => {
      try { await cambiarRolMembresia({ membresiaId, rol }); router.refresh(); }
      finally { setRowPendingId(null); }
    });
  }

  function quitar(membresiaId: string, nombreUsuario: string) {
    if (!window.confirm(`¿Quitar el acceso de ${nombreUsuario} a ${bateria.nombre}?`)) return;
    setRowPendingId(membresiaId);
    startTransition(async () => {
      try { await quitarAcceso({ membresiaId }); router.refresh(); }
      finally { setRowPendingId(null); }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      <Link href="/superadmin/baterias" className="flex items-center gap-1 text-sm text-fg-secondary hover:text-foreground"><ChevronLeft className="size-4" />Baterías</Link>
      <header className="pb-1">
        <h1 className="text-2xl font-extrabold tracking-tight">{bateria.nombre}</h1>
        <p className="text-sm text-fg-secondary">{bateria.comparsa || "Sin comparsa"}</p>
      </header>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Datos de la batería</h2>
        <form aria-label="Datos de la batería" className="space-y-5" onSubmit={guardarDatos}>
          <div><label htmlFor="bd-nombre" className={label}>Nombre</label><Input id="bd-nombre" maxLength={100} required value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div><label htmlFor="bd-comparsa" className={label}>Comparsa (opcional)</label><Input id="bd-comparsa" maxLength={100} value={comparsa} onChange={(e) => setComparsa(e.target.value)} /></div>
          <Notice value={notices.datos} />
          <Button type="submit" disabled={pending}>Guardar</Button>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Usuarios de esta batería</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpenNuevo((v) => !v)}><Plus className="size-3.5" />Agregar usuario</Button>
        </div>

        {openNuevo && (
          <form aria-label="Agregar usuario" className="space-y-5 rounded-xl border border-border p-4" onSubmit={crearUsuario}>
            <div><label htmlFor="nu-nombre" className={label}>Nombre</label><Input id="nu-nombre" maxLength={100} required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} /></div>
            <div><label htmlFor="nu-email" className={label}>Email</label><Input id="nu-email" type="email" required value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} /></div>
            <div><label htmlFor="nu-password" className={label}>Contraseña inicial</label><PasswordInput id="nu-password" minLength={8} maxLength={128} required value={nuevoPassword} onChange={(e) => setNuevoPassword(e.target.value)} /></div>
            <div>
              <label htmlFor="nu-rol" className={label}>Rol</label>
              <select id="nu-rol" value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value as RolMembresia)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
                <option value="director">Director</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <Notice value={notices.nuevo} />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>Agregar</Button>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setOpenNuevo(false)}>Cancelar</Button>
            </div>
          </form>
        )}

        <ul className="space-y-2">
          {bateria.usuarios.map((u) => (
            <li key={u.membresiaId} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{u.nombre}</div>
                <div className="truncate text-fg-secondary">{u.email}</div>
              </div>
              <select
                aria-label={`Rol de ${u.nombre} en ${bateria.nombre}`}
                value={u.rol}
                disabled={pending && rowPendingId === u.membresiaId}
                onChange={(e) => cambiarRol(u.membresiaId, e.target.value as RolMembresia)}
                className="h-8 rounded-lg border border-border bg-card px-2 text-[13px]"
              >
                <option value="director">{ROL_LABEL.director}</option>
                <option value="admin">{ROL_LABEL.admin}</option>
              </select>
              <Button type="button" variant="destructive" size="sm" disabled={pending && rowPendingId === u.membresiaId} onClick={() => quitar(u.membresiaId, u.nombre)}>
                Quitar acceso
              </Button>
            </li>
          ))}
          {bateria.usuarios.length === 0 && <p className="text-sm text-fg-secondary">Sin usuarios en esta batería.</p>}
        </ul>
      </section>
    </div>
  );
}
