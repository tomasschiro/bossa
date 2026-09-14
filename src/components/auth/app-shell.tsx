/* eslint-disable @next/next/no-location-assign-relative-destination -- Full navigation clears cached protected UI when the session changes. */
"use client";

import { NaipesContext } from "@/components/naipes/naipes-context";
import { authClient } from "@/lib/auth-client";
import { UserContext } from "@/components/auth/user-context";
import { seleccionarBateria } from "@/lib/bateria-actions";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Moon, LogOut } from "lucide-react";
import { cn } from "cn";
import { BossaLogo } from "@/components/ritmistas/bossa-logo";
import {
  NaipesIcon,
  RitmistasIcon,
  InventarioIcon,
  DashboardIcon,
  PresupuestoIcon,
  BeneficiosIcon,
  AgendaIcon,
  ConfigIcon,
} from "@/components/ritmistas/nav-icons";
import { useDarkMode } from "@/lib/use-dark-mode";
import { HistorialIcon } from "@/components/ritmistas/nav-icons";

const MODULES = [
  { label: "Dashboard", Icon: DashboardIcon, bd: "/base-de-datos/dashboard", carnaval: "/dashboard" },
  { label: "Ritmistas", Icon: RitmistasIcon, bd: "/ritmistas/base-de-datos", carnaval: "/ritmistas/carnaval" },
  { label: "Naipes", Icon: NaipesIcon, bd: "/naipes", carnaval: "/carnaval/naipes" },
  { label: "Inventario", Icon: InventarioIcon, bd: "/inventario", carnaval: "/carnaval/inventario" },
  { label: "Presupuesto", Icon: PresupuestoIcon, bd: "/base-de-datos/presupuesto", carnaval: "/presupuesto" },
  { label: "Beneficios", Icon: BeneficiosIcon, bd: "/base-de-datos/beneficios", carnaval: "/carnaval/beneficios" },
  { label: "Agenda", Icon: AgendaIcon, bd: "/base-de-datos/agenda", carnaval: "/agenda" },
];
const DB_ONLY_MODULES = [
  { label: "Historial", Icon: HistorialIcon, href: "/base-de-datos/historial" },
];
function ModuleSwitch({ isDb }: { isDb: boolean }) {
  const pathname = usePathname();
  const current = MODULES.find((m) => pathname === m.bd || pathname === m.carnaval);
  const config = pathname?.endsWith("/configuracion");
  const bd = config ? "/base-de-datos/configuracion" : current?.bd ?? "/ritmistas/base-de-datos";
  const carnaval = config ? "/configuracion" : current?.carnaval ?? "/ritmistas/carnaval";
  return <div aria-label="Módulo" className="grid grid-cols-[1.15fr_1fr] gap-1 rounded-xl bg-bg-subtle p-1">
    {[{ href: bd, label: "Base de Datos", active: isDb }, { href: carnaval, label: "Carnaval", active: !isDb }].map((item) => <Link key={item.href} href={item.href} aria-current={item.active ? "true" : undefined} className={cn("flex h-9 items-center justify-center whitespace-nowrap rounded-lg px-2 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary", item.active ? "bg-card text-foreground shadow-sm" : "text-fg-secondary hover:text-foreground")}>{item.label}</Link>)}
  </div>;
}

function NavButton({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ active?: boolean }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "mb-1 flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors",
        active ? "bg-foreground text-background" : "text-fg-secondary hover:bg-bg-subtle",
      )}
    >
      <Icon active={active} />
      {label}
    </Link>
  );
}

export default function AppShell({ children, user, bateria, carnaval, baterias, naipes, alertas }: { children: React.ReactNode; alertas: number; naipes: string[]; user: { name: string }; bateria: { id: string; nombre: string }; carnaval: number | null; baterias: { id: string; nombre: string }[] }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 60000);
    return () => { window.removeEventListener("focus", refresh); clearInterval(timer); };
  }, [router]);
  const { dark, toggle } = useDarkMode();

  const isDb =
    pathname?.startsWith("/ritmistas/base-de-datos") ||
    pathname?.startsWith("/naipes") ||
    pathname?.startsWith("/inventario") ||
    pathname?.startsWith("/base-de-datos/");

  const items = MODULES.map((m) => ({ label: m.label, Icon: m.Icon, href: isDb ? m.bd : m.carnaval }));
  const configHref = isDb ? "/base-de-datos/configuracion" : "/configuracion";

  return (
    <NaipesContext.Provider value={naipes}><UserContext.Provider value={user}><div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden h-full w-[240px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card p-[18px_14px] md:flex">
        <div className="mb-[22px] flex items-center gap-2.5">
          <BossaLogo />
          <div className="min-w-0">
            <div className="truncate text-base font-extrabold leading-tight text-foreground">{bateria.nombre}</div>
            {carnaval && <div className="text-[11px] leading-tight text-fg-tertiary">Carnaval {carnaval}</div>}
          </div>
        </div>

        <div className="mb-5"><ModuleSwitch isDb={Boolean(isDb)} /></div>

        {baterias.length > 1 && <form action={seleccionarBateria} className="mb-4">
          <label htmlFor="bateriaId" className="text-xs">Batería</label>
          <select id="bateriaId" name="bateriaId" defaultValue={bateria.id} className="w-full rounded border p-2" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
            {baterias.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </form>}
        <nav className="flex flex-col">
          {items.map((item) => (
            <NavButton
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.Icon}
              active={pathname?.startsWith(item.href) ?? false}
            />
          ))}
          {isDb && DB_ONLY_MODULES.map((item) => (
            <NavButton
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.Icon}
              active={pathname?.startsWith(item.href) ?? false}
            />
          ))}
        </nav>

        <div className="flex-1" />

        <NavButton
          href={configHref}
          label="Configuración"
          Icon={ConfigIcon}
          active={pathname?.endsWith("/configuracion") ?? false}
        />

        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
            {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] leading-tight font-semibold text-foreground">{user.name}</div>
            <div className="truncate text-[11px] leading-tight text-fg-tertiary">Director</div>
          </div>
          <button
            onClick={toggle}
            aria-label={dark ? "Modo claro" : "Modo oscuro"}
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary hover:bg-bg-subtle hover:text-foreground"
          >
            <Moon className="size-3.5" />
          </button>
          <button
            onClick={async () => { await authClient.signOut(); window.location.assign("/login"); }}
            aria-label="Cerrar sesión"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary hover:bg-bg-subtle hover:text-foreground"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="space-y-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><BossaLogo size={24} /><div className="min-w-0"><div className="truncate text-sm font-bold leading-tight">{bateria.nombre}</div>{carnaval && <div className="text-[10px] leading-tight text-fg-tertiary">Carnaval {carnaval}</div>}</div></div><div className="flex gap-2"><button type="button" onClick={toggle} aria-label={dark ? "Modo claro" : "Modo oscuro"} className="flex size-9 items-center justify-center rounded-lg bg-bg-subtle"><Moon className="size-4" /></button><button type="button" aria-label="Cerrar sesión" onClick={async () => { await authClient.signOut(); window.location.assign("/login"); }} className="flex size-9 items-center justify-center rounded-lg bg-bg-subtle"><LogOut className="size-4" /></button></div></div>
          <ModuleSwitch isDb={Boolean(isDb)} />
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-xs md:px-8">
          <Link href={isDb ? "/base-de-datos/agenda" : "/agenda"} className="font-semibold text-primary">Agenda · {alertas ? `${alertas} recordatorios` : "Sin avisos próximos"}</Link>
          <Link href="/ritmistas/carnaval" className="text-fg-secondary md:hidden">Ritmistas</Link>
        </div>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-5 md:px-8 md:py-7">{children}</div>
      </main>
      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        {[...items, { href: configHref, label: "Ajustes", Icon: ConfigIcon }].map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={pathname?.startsWith(href) ? "page" : undefined} className={cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[9px] font-medium", pathname?.startsWith(href) ? "bg-primary/10 text-primary" : "text-fg-secondary")}><Icon active={pathname?.startsWith(href)} /><span>{label}</span></Link>)}
      </nav>
    </div></UserContext.Provider></NaipesContext.Provider>
  );
}
