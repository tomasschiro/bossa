"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/ritmistas-utils";
import { metricsBeneficiosDistribuidos } from "@/lib/presupuesto-utils";
import { MoneyHeroCard } from "./money-hero-card";
import { CategoryGrid, CategoryDonut, categoryColor } from "./category-donut";
import { MovimientosTable } from "./movimientos-table";
import type { BeneficioDistribuidoTipo } from "@/lib/types";

interface BeneficiosDistribuidosTabProps {
  tipos: BeneficioDistribuidoTipo[];
  onAddTipo: () => void;
}

export function BeneficiosDistribuidosTab({ tipos, onAddTipo }: BeneficiosDistribuidosTabProps) {
  const pathname = usePathname();
  const base = pathname.startsWith("/base-de-datos/") ? "/base-de-datos/beneficios" : "/carnaval/beneficios";
  const { vendidoTotal } = metricsBeneficiosDistribuidos(tipos);

  const categorias = tipos.map((t) => ({
    label: t.nombre,
    value: t.vendedores.flatMap((v) => v.ventas).reduce((sum, v) => sum + v.monto, 0),
  }));
  const donutSegments = categorias
    .filter((c) => c.value > 0)
    .map((c, i) => ({ label: c.label, value: c.value, color: categoryColor(i) }));

  const movimientos = tipos.flatMap((t) =>
    t.vendedores.flatMap((v) =>
      v.ventas.map((venta) => ({
        id: venta.id,
        concepto: v.ritmistaNombre ?? v.nombreExterno ?? "Vendedor",
        categoria: t.nombre,
        fechaIso: venta.fechaIso,
        monto: venta.monto,
        registradoPor: venta.registradoPor,
      })),
    ),
  );

  return (
    <div>
      <div className="mb-6">
        <MoneyHeroCard type="balance" label="Total distribuido a ritmistas" value={vendidoTotal} />
      </div>

      <CategoryGrid categories={categorias} />

      {donutSegments.length > 0 && (
        <CategoryDonut
          title="Distribución por tipo"
          segments={donutSegments}
          totalLabel={`$${vendidoTotal.toLocaleString("es-AR")}`}
          totalCaption="Vendido"
        />
      )}

      <div className="mb-6">
        <MovimientosTable movimientos={movimientos} emptyLabel="Sin ventas registradas." />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Vendedores por tipo</h2>
        <Button onClick={onAddTipo}>+ Nuevo tipo</Button>
      </div>
      <div className="flex flex-col gap-3">
        {tipos.map((t) => (
          <Link
            key={t.id}
            href={`${base}/${t.id}`}
            className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-bg-subtle"
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {t.nombre}
                {t.trackearNumeros && (
                  <span className="inline-flex h-4.5 items-center rounded-full border border-border px-1.5 text-[10px] font-medium text-fg-tertiary">
                    Numerado {t.rangoDesde}–{t.rangoHasta}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-fg-secondary">
                {formatMoney(t.precioUnidad)} / unidad · Vence {formatDate(t.fechaLimiteIso)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-fg-secondary">{t.vendedores.length} vendedor(es)</span>
              <ChevronRight className="size-4 text-fg-tertiary" />
            </div>
          </Link>
        ))}
        {tipos.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-fg-tertiary">
            Sin tipos de beneficio distribuido registrados.
          </div>
        )}
      </div>
    </div>
  );
}
