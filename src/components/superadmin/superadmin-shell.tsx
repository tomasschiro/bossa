/* eslint-disable @next/next/no-location-assign-relative-destination -- Full navigation clears cached protected UI when the session changes. */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, LogOut, Building2, Users } from "lucide-react";
import { cn } from "cn";
import { BossaLogo } from "@/components/ritmistas/bossa-logo";
import { authClient } from "@/lib/auth-client";
import { useDarkMode } from "@/lib/use-dark-mode";

const ITEMS = [
  { href: "/superadmin/baterias", label: "Baterías", Icon: Building2 },
  { href: "/superadmin/usuarios", label: "Usuarios", Icon: Users },
];

function NavButton({ href, label, Icon, active }: { href: string; label: string; Icon: typeof Building2; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "mb-1 flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors",
        active ? "bg-foreground text-background" : "text-fg-secondary hover:bg-bg-subtle",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

export function SuperAdminShell({ children, user }: { children: React.ReactNode; user: { name: string } }) {
  const pathname = usePathname();
  const { dark, toggle } = useDarkMode();

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden h-full w-[240px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card p-[18px_14px] md:flex">
        <div className="mb-[22px] flex items-center gap-2.5">
          <BossaLogo />
          <div className="text-base font-extrabold text-foreground">Superadmin</div>
        </div>

        <nav className="flex flex-col">
          {ITEMS.map((item) => (
            <NavButton key={item.href} href={item.href} label={item.label} Icon={item.Icon} active={pathname?.startsWith(item.href) ?? false} />
          ))}
        </nav>

        <div className="flex-1" />

        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
            {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] leading-tight font-semibold text-foreground">{user.name}</div>
            <div className="truncate text-[11px] leading-tight text-fg-tertiary">Superadmin</div>
          </div>
          <button onClick={toggle} aria-label={dark ? "Modo claro" : "Modo oscuro"} className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary hover:bg-bg-subtle hover:text-foreground">
            <Moon className="size-3.5" />
          </button>
          <button onClick={async () => { await authClient.signOut(); window.location.assign("/login"); }} aria-label="Cerrar sesión" className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary hover:bg-bg-subtle hover:text-foreground">
            <LogOut className="size-3.5" />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2"><BossaLogo size={24} /><span className="text-sm font-bold">Superadmin</span></div>
          <div className="flex gap-2">
            <button type="button" onClick={toggle} aria-label={dark ? "Modo claro" : "Modo oscuro"} className="flex size-9 items-center justify-center rounded-lg bg-bg-subtle"><Moon className="size-4" /></button>
            <button type="button" aria-label="Cerrar sesión" onClick={async () => { await authClient.signOut(); window.location.assign("/login"); }} className="flex size-9 items-center justify-center rounded-lg bg-bg-subtle"><LogOut className="size-4" /></button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-5 md:px-8 md:py-7">{children}</div>
      </main>

      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        {ITEMS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} aria-current={pathname?.startsWith(href) ? "page" : undefined} className={cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[9px] font-medium", pathname?.startsWith(href) ? "bg-primary/10 text-primary" : "text-fg-secondary")}>
            <Icon className="size-4" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
