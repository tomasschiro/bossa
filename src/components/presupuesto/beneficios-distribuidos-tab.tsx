"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/ritmistas-utils";
import { metricsBeneficiosDistribuidos } from "@/lib/presupuesto-utils";
import { MoneyHeroCard } from "./money-hero-card";
import { CategoryGrid, CategoryDonut, categoryColor } from "./category-donut";
import { MovimientosTable } from "./movimientos-table";
import type { BeneficioDistribuidoTipo, BeneficioDistribuidoVendedor } from "@/lib/types";

interface BeneficiosDistribuidosTabProps {
  tipos: BeneficioDistribuidoTipo[];
  onAddTipo: () => void;
  onAddVendedor: (tipoId: string) => void;
  onAddVenta: (vendedor: BeneficioDistribuidoVendedor) => void;
}

function VendedorRow({ vendedor, onAddVenta }: { vendedor: BeneficioDistribuidoVendedor; onAddVenta: () => void }) {
  const totalVendido = vendedor.ventas.reduce((sum, v) => sum + v.monto, 0);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {vendedor.ritmistaNombre ?? vendedor.nombreExterno}
          {!vendedor.ritmistaNombre && (
            <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-fg-tertiary">Externo</span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-fg-secondary">
          {vendedor.ritmistaNombre && vendedor.ritmistaSaldoPendiente != null && (
            <>Saldo pendiente: {formatMoney(vendedor.ritmistaSaldoPendiente)} · </>
          )}
          {!vendedor.ritmistaNombre && vendedor.contactoExterno && <>{vendedor.contactoExterno} · </>}
          Asignadas: {vendedor.unidadesAsignadas} · Vendido: {formatMoney(totalVendido)}
        </div>
      </div>
      <Button variant="outline" size="sm" className="bg-card" onClick={onAddVenta}>
        + Venta
      </Button>
    </div>
  );
}

export function BeneficiosDistribuidosTab({ tipos, onAddTipo, onAddVendedor, onAddVenta }: BeneficiosDistribuidosTabProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
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
          <div key={t.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              type="button"
              className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
              onClick={() => setExpanded((prev) => (prev === t.id ? null : t.id))}
            >
              <div>
                <div className="text-sm font-semibold text-foreground">{t.nombre}</div>
                <div className="mt-0.5 text-xs text-fg-secondary">
                  {formatMoney(t.precioUnidad)} / unidad · Vence {formatDate(t.fechaLimiteIso)}
                </div>
              </div>
              <span className="text-xs font-medium text-fg-secondary">{t.vendedores.length} vendedor(es)</span>
            </button>
            {expanded === t.id && (
              <div>
                {t.vendedores.map((v) => (
                  <VendedorRow key={v.id} vendedor={v} onAddVenta={() => onAddVenta(v)} />
                ))}
                <div className="border-t border-border px-4 py-3">
                  <Button variant="outline" size="sm" className="bg-card" onClick={() => onAddVendedor(t.id)}>
                    + Vendedor
                  </Button>
                </div>
              </div>
            )}
          </div>
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
