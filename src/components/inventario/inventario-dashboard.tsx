"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipsFilter } from "./chips-filter";
import type { InstrumentoEstado, ItemEtiqueta, ItemPrioridad } from "@/lib/types";

const ETIQUETA_FILTER_OPTIONS = ["Todos", "Necesidad", "Para venta"];

const ESTADO_BAR_COLOR: Record<InstrumentoEstado, string> = {
  Bueno: "bg-success",
  Regular: "bg-warning",
  "Necesita reparación": "bg-warning",
  "De baja": "bg-border-strong",
};

interface InventarioDashboardProps<T extends { etiqueta: ItemEtiqueta | null; prioridad: ItemPrioridad | null; cantidad: number }> {
  isInstrumentos: boolean;
  items: T[];
  groupKey: (item: T) => string;
  groupLabel: string;
  etiquetaFilter: string;
  onEtiquetaFilterChange: (value: string) => void;
  addLabel: string;
  onAdd: () => void;
  onOpenGroup: (name: string) => void;
}

function sumCantidad<T extends { cantidad: number }>(items: T[]): number {
  return items.reduce((s, i) => s + i.cantidad, 0);
}

export function InventarioDashboard<
  T extends {
    etiqueta: ItemEtiqueta | null;
    prioridad: ItemPrioridad | null;
    cantidad: number;
    estado?: InstrumentoEstado;
  },
>({
  isInstrumentos,
  items,
  groupKey,
  groupLabel,
  etiquetaFilter,
  onEtiquetaFilterChange,
  addLabel,
  onAdd,
  onOpenGroup,
}: InventarioDashboardProps<T>) {
  const total = sumCantidad(items);
  const urgente = sumCantidad(items.filter((i) => i.etiqueta === "Necesidad" && i.prioridad === "Urgente"));
  const deseable = sumCantidad(items.filter((i) => i.etiqueta === "Necesidad" && i.prioridad === "Deseable"));
  const venta = sumCantidad(items.filter((i) => i.etiqueta === "Para venta"));
  const sinEtiqueta = Math.max(total - urgente - deseable - venta, 0);

  const chartSegments = [
    { label: "Necesidad urgente", value: urgente, className: "bg-danger" },
    { label: "Necesidad deseable", value: deseable, className: "bg-warning" },
    { label: "Para venta", value: venta, className: "bg-success" },
    { label: "Sin etiqueta", value: sinEtiqueta, className: "bg-border-strong" },
  ].filter((s) => s.value > 0);

  const matchesEtiqueta = (item: T) =>
    etiquetaFilter === "Todos" || item.etiqueta === etiquetaFilter;

  const groups = new Map<string, T[]>();
  for (const item of items.filter(matchesEtiqueta)) {
    const key = groupKey(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const breakdown = [...groups.entries()]
    .map(([name, rows]) => {
      const rowTotal = sumCantidad(rows);
      const isUrgente = rows.some((r) => r.etiqueta === "Necesidad" && r.prioridad === "Urgente");
      if (isInstrumentos) {
        const byEstado = rows.reduce<Record<string, number>>((acc, r) => {
          const estado = (r as { estado?: InstrumentoEstado }).estado;
          if (estado) acc[estado] = (acc[estado] ?? 0) + r.cantidad;
          return acc;
        }, {});
        return {
          name,
          total: rowTotal,
          isUrgente,
          segments: Object.entries(byEstado).map(([estado, value]) => ({
            value,
            className: ESTADO_BAR_COLOR[estado as InstrumentoEstado],
          })),
          detail: null as string | null,
        };
      }
      return {
        name,
        total: rowTotal,
        isUrgente,
        segments: null,
        detail: `${rows.length} ${rows.length === 1 ? "variante" : "variantes"}`,
      };
    })
    .sort((a, b) => (a.isUrgente === b.isUrgente ? b.total - a.total : a.isUrgente ? -1 : 1));

  return (
    <div>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
        <div className="rounded-xl border border-transparent bg-primary/10 p-3.5">
          <div className="mb-1 text-[12px] font-semibold text-fg-secondary">Total en stock</div>
          <div className="font-mono-num text-2xl font-semibold text-foreground">{total}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="mb-1 text-[12px] font-semibold text-fg-secondary">Necesidad urgente</div>
          <div className="font-mono-num text-2xl font-semibold text-danger">{urgente}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="mb-1 text-[12px] font-semibold text-fg-secondary">Necesidad deseable</div>
          <div className="font-mono-num text-2xl font-semibold text-warning">{deseable}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="mb-1 text-[12px] font-semibold text-fg-secondary">Para venta</div>
          <div className="font-mono-num text-2xl font-semibold text-success">{venta}</div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex h-3.5 overflow-hidden rounded-full bg-bg-muted">
          {chartSegments.map((seg) => (
            <div key={seg.label} className={seg.className} style={{ flex: seg.value }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {chartSegments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1.5 text-xs text-fg-secondary">
              <span className={`size-2 shrink-0 rounded-full ${seg.className}`} />
              {seg.label} · {seg.value}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-semibold tracking-[0.06em] text-fg-secondary uppercase">
          {groupLabel}
        </div>
        <div className="flex items-center gap-2.5">
          <ChipsFilter value={etiquetaFilter} onChange={onEtiquetaFilterChange} options={ETIQUETA_FILTER_OPTIONS} compact />
          <Button onClick={onAdd}>{addLabel}</Button>
        </div>
      </div>

      <div className="hidden overflow-auto rounded-lg border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-fg-secondary">
                {isInstrumentos ? "Tipo" : "Categoría"}
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-fg-secondary">Cantidad</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-fg-secondary">Distribución</th>
              <th className="w-8 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b) => (
              <tr
                key={b.name}
                onClick={() => onOpenGroup(b.name)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-subtle"
              >
                <td className="px-4 py-3 font-medium text-foreground underline decoration-border-strong underline-offset-4">
                  {b.name}
                </td>
                <td className="px-4 py-3 text-right font-mono-num">{b.total}</td>
                <td className="px-4 py-3 text-fg-secondary">
                  {b.segments ? (
                    <div className="flex h-2 w-35 overflow-hidden rounded-full bg-bg-muted">
                      {b.segments.map((seg, idx) => (
                        <div key={idx} className={seg.className} style={{ flex: seg.value }} />
                      ))}
                    </div>
                  ) : (
                    b.detail
                  )}
                </td>
                <td className="px-4 py-3 text-fg-tertiary">
                  <ChevronRight className="size-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border md:hidden">
        {breakdown.map((b) => (
          <button
            key={b.name}
            onClick={() => onOpenGroup(b.name)}
            className="flex cursor-pointer items-center gap-3 bg-card p-3.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground underline decoration-border-strong underline-offset-4">
                {b.name}
              </div>
              <div className="mt-1 text-xs text-fg-secondary">{b.detail}</div>
            </div>
            <div className="font-mono-num text-sm text-fg-secondary">{b.total}</div>
            <ChevronRight className="size-4 text-fg-tertiary" />
          </button>
        ))}
      </div>
    </div>
  );
}
