"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const TABS = [
  { slug: "ritmistas", label: "Ritmistas" },
  { slug: "presupuesto", label: "Presupuesto" },
  { slug: "agenda", label: "Agenda" },
];

export function HistorialTabs({ edicionId }: { edicionId: string }) {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const href = `/base-de-datos/historial/${edicionId}/${tab.slug}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tab.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors",
              active ? "border-foreground text-foreground" : "border-transparent text-fg-secondary hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
