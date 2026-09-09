"use client";
import { CarnavalSettings } from "./carnaval-settings";
import { useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Palette, UserRound, LockKeyhole, ChevronDown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarBateria, guardarPaleta, guardarNombreUsuario, subirLogo, quitarLogo, type getConfiguracion } from "@/lib/configuracion-actions";
import { PALETA_DEFAULT, colorValido, leerPaleta, textoSobreColor, type Paleta } from "@/lib/paleta";
import { authClient } from "@/lib/auth-client";

const ROL_LABEL: Record<string, string> = { director: "Director", admin: "Administrador" };

type Data = Awaited<ReturnType<typeof getConfiguracion>>;
function Notice({ value }: { value?: { error?: string; success?: string } }) { return value?.error ? <p role="alert" className="text-sm text-danger">{value.error}</p> : value?.success ? <p role="status" className="text-sm text-success">{value.success}</p> : null; }
function SettingsSection({ title, description, icon, children, defaultOpen = false, trailing }: { title: string; description: string; icon: ReactNode; children: ReactNode; defaultOpen?: boolean; trailing?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.025)]">
    <h2><button type="button" aria-expanded={open} aria-controls={id} aria-label={title} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-bg-subtle/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:gap-4 sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block truncate text-xs font-normal text-fg-secondary">{description}</span></span>
      {trailing}<ChevronDown className={`size-4 shrink-0 text-fg-tertiary transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
    </button></h2>
    <div id={id} hidden={!open} className="border-t border-border px-4 py-5 sm:px-6 sm:py-6">{children}</div>
  </section>;
}
const card = "space-y-5";
const label = "mb-1.5 block text-sm font-medium";
export function ConfiguracionView({ data }: { data: Data }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(data.bateria.nombre);
  const [comparsa, setComparsa] = useState(data.bateria.comparsa);
  const [paleta, setPaleta] = useState(data.bateria.paleta);
  const [logoUrl, setLogoUrl] = useState(data.bateria.logoUrl);
  const [logoPending, setLogoPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userName, setUserName] = useState(data.user.nombre);
  const [notices, setNotices] = useState<Record<string, { error?: string; success?: string }>>({});
  const [pending, startTransition] = useTransition();
  const [passwordPending, setPasswordPending] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  function notice(key: string, value: { error?: string; success?: string }) { setNotices((prev) => ({ ...prev, [key]: value })); }
  function save(event: FormEvent, key: string, action: () => Promise<{ error?: string }>, success: string) {
    event.preventDefault(); notice(key, {});
    startTransition(async () => { try { const result = await action(); notice(key, result.error ? { error: result.error } : { success }); if (!result.error) router.refresh(); } catch { notice(key, { error: "No se pudo guardar. Intentá nuevamente." }); } });
  }
  function onElegirLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.set("logo", file);
    notice("logo", {}); setLogoPending(true);
    startTransition(async () => {
      try {
        const result = await subirLogo(formData);
        if ("error" in result) { notice("logo", { error: result.error }); return; }
        setLogoUrl(result.logoUrl); notice("logo", { success: "Logo actualizado." }); router.refresh();
      } catch { notice("logo", { error: "No se pudo subir el logo. Intentá nuevamente." }); }
      finally { setLogoPending(false); }
    });
  }
  function onQuitarLogo() {
    notice("logo", {}); setLogoPending(true);
    startTransition(async () => {
      try {
        const result = await quitarLogo();
        if ("error" in result) { notice("logo", { error: result.error }); return; }
        setLogoUrl(null); notice("logo", { success: "Logo eliminado." }); router.refresh();
      } catch { notice("logo", { error: "No se pudo quitar el logo. Intentá nuevamente." }); }
      finally { setLogoPending(false); }
    });
  }
  const preview = leerPaleta(paleta);
  return <div className="mx-auto max-w-3xl space-y-6 pb-6">
    <header className="space-y-2 pb-1"><h1 className="text-2xl font-extrabold tracking-tight">Configuración</h1><p className="text-sm text-fg-secondary">Ajustá la identidad de tu batería y los datos de tu cuenta.</p></header>
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-fg-tertiary">Tu batería</p>
        <SettingsSection title="Batería" description={data.bateria.comparsa || "Nombre e identidad de tu institución"} icon={<Building2 className="size-[18px]" />} defaultOpen>
        <div className="space-y-5">
          <div>
            <label className={label}>Logo de la institución</label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo de la batería" className="size-16 shrink-0 rounded-lg border border-border object-contain" />
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-fg-tertiary"><Building2 className="size-6" /></span>
              )}
              <div className="flex flex-col gap-2">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={onElegirLogo} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={logoPending} onClick={() => fileInputRef.current?.click()}>{logoPending ? "Subiendo…" : "Subir logo"}</Button>
                  {logoUrl && <Button type="button" variant="destructive" disabled={logoPending} onClick={onQuitarLogo}>Quitar logo</Button>}
                </div>
                <p className="text-xs text-fg-secondary">PNG, JPG, SVG o WebP, hasta 2 MB.</p>
              </div>
            </div>
            <Notice value={notices.logo} />
          </div>
          <form aria-label="Datos de la batería" className={card} onSubmit={(e) => save(e, "bateria", () => guardarBateria({ nombre, comparsa }), "Datos de la batería guardados.")}>
            <p className="text-sm text-fg-secondary">Estos datos son compartidos por los directores de esta batería.</p>
            <div><label htmlFor="bateria-nombre" className={label}>Nombre de la batería</label><Input id="bateria-nombre" maxLength={100} required value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
            <div><label htmlFor="bateria-comparsa" className={label}>Comparsa (opcional)</label><Input id="bateria-comparsa" maxLength={100} value={comparsa} onChange={(e) => setComparsa(e.target.value)} /></div>
            <Notice value={notices.bateria} /><Button type="submit" disabled={pending}>Guardar batería</Button>
          </form>
        </div>
        </SettingsSection>
        <SettingsSection title="Colores" description="Personalizá la apariencia en modo claro y oscuro" icon={<Palette className="size-[18px]" />} trailing={<span className="hidden gap-1 sm:flex" aria-hidden="true">{Object.values(data.bateria.paleta).map((color, index) => <span key={index} className="size-4 rounded-full border border-black/10" style={{ background: color }} />)}</span>}>
        <form aria-label="Colores de la batería" className={card} onSubmit={(e) => save(e, "paleta", () => guardarPaleta(paleta), "Colores guardados y aplicados a tu batería.")}>
          <p className="text-sm text-fg-secondary">Personalizá los botones y acentos. El texto se adapta para mantener el contraste.</p>
          {([["principal", "Principal en modo claro"], ["principalOscuro", "Principal en modo oscuro"], ["acento", "Acento"]] as [keyof Paleta, string][]).map(([key, title]) => <div key={key}><label className={label} htmlFor={`color-${key}`}>{title}</label><div className="flex gap-2"><input type="color" aria-label={`Elegir ${title.toLowerCase()}`} value={colorValido(paleta[key]) ? paleta[key] : PALETA_DEFAULT[key]} onChange={(e) => setPaleta({ ...paleta, [key]: e.target.value.toUpperCase() })} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-1" /><Input id={`color-${key}`} value={paleta[key]} maxLength={7} pattern="#[0-9a-fA-F]{6}" required onChange={(e) => setPaleta({ ...paleta, [key]: e.target.value })} className="max-w-36 font-mono" /></div></div>)}
          <div className="grid grid-cols-2 gap-2" aria-label="Vista previa de colores">{[false, true].map((dark) => <div key={String(dark)} className="space-y-3 rounded-xl border border-border p-3" style={{ background: dark ? "#141414" : "#FAFAF7", color: dark ? "#FAFAF7" : "#0A0A0A" }}><p className="text-xs">{dark ? "Modo oscuro" : "Modo claro"}</p><span className="inline-block rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: dark ? preview.principalOscuro : preview.principal, color: textoSobreColor(dark ? preview.principalOscuro : preview.principal) }}>Botón</span><span className="ml-2 inline-block rounded-full px-2 py-1 text-xs" style={{ background: preview.acento, color: textoSobreColor(preview.acento) }}>Acento</span></div>)}</div>
          <Notice value={notices.paleta} /><div className="flex flex-wrap gap-2"><Button type="submit" disabled={pending}>Guardar colores</Button><Button type="button" variant="outline" disabled={pending} onClick={() => { setPaleta({ ...PALETA_DEFAULT }); notice("paleta", { success: "Paleta inicial seleccionada. Guardá para aplicarla." }); }}>Restablecer colores</Button></div>
        </form>
        </SettingsSection>
      </div>
      <CarnavalSettings key={`${data.carnaval.actual?.id ?? "sin-activa"}:${data.carnaval.preparada?.id ?? "sin-preparada"}`} data={data.carnaval} />
      <div className="space-y-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-fg-tertiary">Tu cuenta</p>
        <SettingsSection title="Mi cuenta" description={data.user.email} icon={<UserRound className="size-[18px]" />}>
        <form aria-label="Mi cuenta" className={card} onSubmit={(e) => save(e, "cuenta", () => guardarNombreUsuario(userName), "Nombre actualizado. Se usará en las próximas operaciones.")}>
          <div><label htmlFor="cuenta-nombre" className={label}>Tu nombre</label><Input id="cuenta-nombre" autoComplete="name" maxLength={100} required value={userName} onChange={(e) => setUserName(e.target.value)} /><p className="mt-2 text-xs text-fg-secondary">Aparece como autor de pagos, entregas y cambios. Los registros históricos conservan su autor original.</p></div>
          <div><label htmlFor="cuenta-email" className={label}>Email de acceso</label><Input id="cuenta-email" type="email" readOnly value={data.user.email} autoComplete="username" /><p className="mt-2 text-xs text-fg-secondary">El email de acceso no se modifica desde esta pantalla.</p></div>
          <Notice value={notices.cuenta} /><Button type="submit" disabled={pending}>Guardar mi nombre</Button>
          <div className="border-t border-border pt-4"><h3 className="text-sm font-semibold">Mis baterías</h3><ul className="mt-2 space-y-1">{data.membresias.map((m) => <li className="flex justify-between gap-2 text-sm" key={m.id}><span>{m.bateria}</span><span className="text-fg-secondary">{ROL_LABEL[m.rol] ?? m.rol}</span></li>)}</ul></div>
          {data.user.esSuperAdmin && <div className="border-t border-border pt-4"><Link href="/superadmin" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><ShieldCheck className="size-4" />Panel de superadmin</Link></div>}
        </form>
        </SettingsSection>
        <SettingsSection title="Contraseña" description="Protegé el acceso a tu cuenta" icon={<LockKeyhole className="size-[18px]" />}>
        <form aria-label="Cambiar contraseña" className={card} onSubmit={async (e) => {
          e.preventDefault(); notice("password", {});
          if (next !== repeat) { notice("password", { error: "Las contraseñas nuevas no coinciden." }); return; }
          if (next === current) { notice("password", { error: "Elegí una contraseña distinta de la actual." }); return; }
          setPasswordPending(true);
          try {
            const result = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
            if (result.error) { notice("password", { error: "No se pudo cambiar la contraseña. Revisá la contraseña actual y usá entre 8 y 128 caracteres para la nueva." }); return; }
            setCurrent(""); setNext(""); setRepeat(""); notice("password", { success: "Contraseña actualizada. Las otras sesiones quedaron cerradas." });
          } catch { notice("password", { error: "No se pudo cambiar la contraseña. Intentá nuevamente." }); } finally { setPasswordPending(false); }
        }}>
          <p className="text-sm text-fg-secondary">Al cambiarla se cierran tus sesiones en otros dispositivos.</p>
          <input type="hidden" name="username" autoComplete="username" value={data.user.email} />
          <div><label htmlFor="password-actual" className={label}>Contraseña actual</label><Input id="password-actual" type="password" autoComplete="current-password" required maxLength={128} value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
          <div><label htmlFor="password-nueva" className={label}>Nueva contraseña</label><Input id="password-nueva" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={next} onChange={(e) => setNext(e.target.value)} /></div>
          <div><label htmlFor="password-repetir" className={label}>Repetir nueva contraseña</label><Input id="password-repetir" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={repeat} onChange={(e) => setRepeat(e.target.value)} /></div>
          <Notice value={notices.password} /><Button type="submit" disabled={passwordPending}>{passwordPending ? "Actualizando…" : "Cambiar contraseña"}</Button>
        </form>
        </SettingsSection>
      </div>
    </div>
  </div>;
}
