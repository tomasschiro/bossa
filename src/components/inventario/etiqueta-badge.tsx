import { cn } from "cn";
import type { ItemEtiqueta, ItemPrioridad } from "@/lib/types";

export function etiquetaLabel(etiqueta: ItemEtiqueta | null, prioridad: ItemPrioridad | null): string | null {
  if (etiqueta === "Necesidad") return prioridad === "Urgente" ? "Necesidad urgente" : "Necesidad deseable";
  if (etiqueta === "Para venta") return "Para venta";
  return null;
}

function etiquetaStyle(etiqueta: ItemEtiqueta | null, prioridad: ItemPrioridad | null): string {
  if (etiqueta === "Necesidad" && prioridad === "Urgente") return "bg-card text-danger border-danger/40";
  if (etiqueta === "Necesidad") return "bg-card text-warning border-warning/40";
  return "bg-card text-success border-success/40";
}

export function EtiquetaBadge({
  etiqueta,
  prioridad,
  className,
}: {
  etiqueta: ItemEtiqueta | null;
  prioridad: ItemPrioridad | null;
  className?: string;
}) {
  const label = etiquetaLabel(etiqueta, prioridad);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-full border px-3 text-[12px] font-medium",
        etiquetaStyle(etiqueta, prioridad),
        className,
      )}
    >
      {label}
    </span>
  );
}
