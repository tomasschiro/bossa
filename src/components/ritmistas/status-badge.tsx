import { cn } from "cn";
import type { EstadoLlegada } from "@/lib/types";

const STATUS_STYLES: Record<EstadoLlegada, string> = {
  Confirmado: "bg-card text-success border-success/40",
  "En duda": "bg-card text-warning border-warning/40",
  "No confirmado": "bg-card text-danger border-danger/40",
};

export function StatusBadge({ estado, className }: { estado: EstadoLlegada; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-full border px-3 text-[12px] font-medium",
        STATUS_STYLES[estado],
        className,
      )}
    >
      {estado}
    </span>
  );
}
