"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { estimadoVsGastado } from "@/lib/presupuesto-utils";
import { MoneyHeroCard } from "./money-hero-card";
import { CategoryGrid, CategoryDonut, categoryColor } from "./category-donut";
import { MovimientosTable } from "./movimientos-table";
import type { PresupuestoGasto, PresupuestoRubroTipo } from "@/lib/types";

interface PresupuestoRubroTabProps {
  rubro: PresupuestoRubroTipo;
  montoEstimado: number;
  gastos: PresupuestoGasto[];
  onEditEstimado: () => void;
  onAddGasto: () => void;
  onEditGasto: (gasto: PresupuestoGasto) => void;
  onDeleteGasto: (gasto: PresupuestoGasto) => void;
}

export function PresupuestoRubroTab({
  rubro,
  montoEstimado,
  gastos,
  onEditEstimado,
  onAddGasto,
  onEditGasto,
  onDeleteGasto,
}: PresupuestoRubroTabProps) {
  const { gastado } = estimadoVsGastado(montoEstimado, gastos);

  const porCategoria = new Map<string, number>();
  for (const g of gastos) porCategoria.set(g.categoria, (porCategoria.get(g.categoria) ?? 0) + g.monto);
  const categorias = [...porCategoria.entries()].map(([label, value]) => ({ label, value }));
  const donutSegments = categorias.map((c, i) => ({ label: c.label, value: c.value, color: categoryColor(i) }));

  return (
    <div>
      <div className="relative mb-6">
        <MoneyHeroCard type="progress" label={`Presupuesto de ${rubro === "Fantasia" ? "fantasía" : "remeras"}`} spent={gastado} budget={montoEstimado} />
        <button
          type="button"
          onClick={onEditEstimado}
          className="absolute top-5.5 right-5.5 text-[11px] font-semibold text-white/80 hover:text-white hover:underline"
        >
          Editar
        </button>
      </div>

      <CategoryGrid categories={categorias.map((c) => ({ label: c.label, value: -c.value }))} />

      {donutSegments.length > 0 && (
        <CategoryDonut
          title="Distribución por categoría"
          segments={donutSegments}
          totalLabel={`$${gastado.toLocaleString("es-AR")}`}
          totalCaption="Gastado"
        />
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Ítems de costo de {rubro === "Fantasia" ? "Fantasía" : "Remeras"}</h2>
        <Button onClick={onAddGasto}>+ Cargar costo</Button>
      </div>

      <MovimientosTable
        title=""
        movimientos={gastos.map((g) => ({
          id: g.id,
          concepto: g.concepto,
          categoria: g.categoria,
          fechaIso: g.fechaIso,
          monto: -g.monto,
          registradoPor: g.registradoPor,
        }))}
        emptyLabel="Sin ítems de costo registrados."
        actions={(m) => {
          const gasto = gastos.find((g) => g.id === m.id)!;
          return (
            <>
              <Button variant="ghost" size="icon-sm" onClick={() => onEditGasto(gasto)} aria-label="Editar">
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onDeleteGasto(gasto)} aria-label="Eliminar">
                <Trash2 className="size-4 text-danger" />
              </Button>
            </>
          );
        }}
      />
    </div>
  );
}
