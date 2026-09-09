"use client";

import { MoneyHeroCard } from "./money-hero-card";
import { CategoryGrid, CategoryDonut, categoryColor } from "./category-donut";
import { MovimientosTable } from "./movimientos-table";
import type { CajaMovimiento } from "@/lib/types";

interface CajaGeneralTabProps {
  movimientos: CajaMovimiento[];
  saldoTotal: number;
  desglose: { categoria: string; saldo: number }[];
  onAsignar?: (categoria: string) => void;
}

export function CajaGeneralTab({ movimientos, saldoTotal, desglose, onAsignar }: CajaGeneralTabProps) {
  const donutSegments = desglose
    .filter((d) => d.saldo !== 0)
    .map((d, i) => ({ label: d.categoria, value: Math.abs(d.saldo), color: categoryColor(i) }));
  const donutTotal = donutSegments.reduce((a, s) => a + s.value, 0);

  return (
    <div>
      <div className="mb-6">
        <MoneyHeroCard type="balance" label="Saldo total de caja" value={saldoTotal} />
      </div>

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
