"use client";

import Link from "next/link";
import { MoneyHeroCard } from "./money-hero-card";
import { CategoryGrid, CategoryDonut, categoryColor } from "./category-donut";
import { MovimientosTable } from "./movimientos-table";
import { formatMoney } from "@/lib/ritmistas-utils";
import type { CajaMovimiento } from "@/lib/types";

interface CajaGeneralTabProps {
  movimientos: CajaMovimiento[];
  saldoTotal: number;
  desglose: { categoria: string; saldo: number }[];
  onAsignar?: (categoria: string) => void;
  beneficiosRecaudadoTotal?: number;
}

export function CajaGeneralTab({ movimientos, saldoTotal, desglose, onAsignar, beneficiosRecaudadoTotal }: CajaGeneralTabProps) {
  const donutSegments = desglose
    .filter((d) => d.saldo !== 0)
    .map((d, i) => ({ label: d.categoria, value: Math.abs(d.saldo), color: categoryColor(i) }));
  const donutTotal = donutSegments.reduce((a, s) => a + s.value, 0);

  return (
    <div>
      <div className="mb-6">
        <MoneyHeroCard type="balance" label="Saldo total de caja" value={saldoTotal} />
      </div>

      {beneficiosRecaudadoTotal !== undefined && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4.5 shadow-[var(--sh-sm)]">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.05em] text-fg-tertiary uppercase">Beneficios</div>
            <div className="mt-1 text-xl font-extrabold text-foreground">{formatMoney(beneficiosRecaudadoTotal)}</div>
            <div className="mt-0.5 text-xs text-fg-secondary">Recaudado entre generales y distribuidos</div>
          </div>
          <Link href="/carnaval/beneficios" className="shrink-0 text-sm font-semibold text-primary hover:underline">
            Ver detalle →
          </Link>
        </div>
      )}

      <CategoryGrid categories={desglose.map((d) => ({ label: d.categoria, value: d.saldo }))} onAsignar={onAsignar} />

      {donutSegments.length > 0 && (
        <CategoryDonut
          title="Distribución por categoría"
          segments={donutSegments}
          totalLabel={`$${donutTotal.toLocaleString("es-AR")}`}
          totalCaption="Movimientos"
        />
      )}

      <MovimientosTable
        movimientos={movimientos.map((m) => ({
          id: m.id,
          concepto: m.concepto,
          categoria: m.categoria,
          fechaIso: m.fechaIso,
          monto: m.tipo === "egreso" ? -m.monto : m.monto,
          registradoPor: m.registradoPor,
        }))}
        emptyLabel="Sin movimientos de caja registrados."
      />
    </div>
  );
}
