import { cn } from "cn";
import type { InstrumentoEstado } from "@/lib/types";

const ESTADO_STYLES: Record<InstrumentoEstado, string> = {
  Bueno: "bg-card text-success border-success/40",
  Regular: "bg-card text-warning border-warning/40",
  "Necesita reparación": "bg-card text-warning border-warning/40",
  "De baja": "bg-card text-danger border-danger/40",
};

export function EstadoBadge({ estado, className }: { estado: InstrumentoEstado; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-full border px-3 text-[12px] font-medium",
        ESTADO_STYLES[estado],
        className,
      )}
    >
      {estado}
    </span>
  );
}
