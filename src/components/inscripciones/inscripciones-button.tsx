import Link from "next/link";
import { Inbox } from "lucide-react";
import { cn } from "cn";

export function InscripcionesButton({ pendientes }: { pendientes: number }) {
  return (
    <Link
      href="/ritmistas/carnaval/inscripciones"
      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Inbox className="size-3.5" />
      Inscripciones pendientes
      <span
        aria-label={`${pendientes} pendientes`}
        className={cn(
          "ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold font-mono-num",
          pendientes > 0 ? "bg-primary text-primary-foreground" : "bg-bg-muted text-fg-secondary",
        )}
      >
        {pendientes}
      </span>
    </Link>
  );
}
