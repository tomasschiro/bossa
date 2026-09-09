"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { crearBateriaConDirector, type getBaterias } from "@/lib/superadmin-actions";

type Baterias = Awaited<ReturnType<typeof getBaterias>>;
const label = "mb-1.5 block text-sm font-medium";

function Notice({ value }: { value?: { error?: string; success?: string } }) {
  return value?.error ? <p role="alert" className="text-sm text-danger">{value.error}</p> : value?.success ? <p role="status" className="text-sm text-success">{value.success}</p> : null;
}

export function BateriasView({ baterias }: { baterias: Baterias }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [comparsa, setComparsa] = useState("");
  const [directorNombre, setDirectorNombre] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [directorPassword, setDirectorPassword] = useState("");
  const [notice, setNotice] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();

  function crear(e: FormEvent) {
    e.preventDefault();
    setNotice({});
    startTransition(async () => {
      try {
        const result = await crearBateriaConDirector({ nombre, comparsa, directorNombre, directorEmail, directorPassword });
        if ("error" in result) { setNotice({ error: result.error }); return; }
        setNombre(""); setComparsa(""); setDirectorNombre(""); setDirectorEmail(""); setDirectorPassword("");
        setOpen(false);
        router.push(`/superadmin/baterias/${result.bateriaId}`);
      } catch { setNotice({ error: "No se pudo crear la batería. Intentá nuevamente." }); }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Baterías</h1>
          <p className="text-sm text-fg-secondary">Todas las baterías del sistema.</p>
        </div>
        <Button type="button" onClick={() => setOpen((v) => !v)}><Plus className="size-4" />Crear batería</Button>
      </header>

      {open && (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold">Nueva batería</h2>
          <form aria-label="Crear batería" className="space-y-5" onSubmit={crear}>
            <div><label htmlFor="ba-nombre" className={label}>Nombre de la batería</label><Input id="ba-nombre" maxLength={100} required value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
            <div><label htmlFor="ba-comparsa" className={label}>Comparsa (opcional)</label><Input id="ba-comparsa" maxLength={100} value={comparsa} onChange={(e) => setComparsa(e.target.value)} /></div>
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-semibold">Primer director</p>
              <div className="space-y-5">
                <div><label htmlFor="ba-dir-nombre" className={label}>Nombre</label><Input id="ba-dir-nombre" maxLength={100} required value={directorNombre} onChange={(e) => setDirectorNombre(e.target.value)} /></div>
                <div><label htmlFor="ba-dir-email" className={label}>Email</label><Input id="ba-dir-email" type="email" required value={directorEmail} onChange={(e) => setDirectorEmail(e.target.value)} /></div>
                <div><label htmlFor="ba-dir-password" className={label}>Contraseña inicial</label><PasswordInput id="ba-dir-password" minLength={8} maxLength={128} required value={directorPassword} onChange={(e) => setDirectorPassword(e.target.value)} /></div>
              </div>
            </div>
            <Notice value={notice} />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>Crear batería</Button>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </section>
      )}

      <ul className="space-y-2">
        {baterias.map((b) => (
          <li key={b.id}>
            <Link href={`/superadmin/baterias/${b.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-bg-subtle/40">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary"><Building2 className="size-[18px]" /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{b.nombre}</div>
                <div className="truncate text-sm text-fg-secondary">{b.comparsa || "Sin comparsa"}</div>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-sm text-fg-secondary"><Users className="size-4" />{b.cantidadUsuarios}</span>
            </Link>
          </li>
        ))}
        {baterias.length === 0 && <p className="text-sm text-fg-secondary">Todavía no hay baterías.</p>}
      </ul>
    </div>
  );
}
