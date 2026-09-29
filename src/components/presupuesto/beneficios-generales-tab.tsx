"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { metricsBeneficios } from "@/lib/presupuesto-utils";
import { MoneyHeroCard } from "./money-hero-card";
import { CategoryGrid, CategoryDonut, categoryColor } from "./category-donut";
import { MovimientosTable } from "./movimientos-table";
import type { BeneficioGeneral } from "@/lib/types";

interface BeneficiosGeneralesTabProps {
  beneficios: BeneficioGeneral[];
  onAdd: () => void;
  onEdit: (b: BeneficioGeneral) => void;
  onDelete: (b: BeneficioGeneral) => void;
}

export function BeneficiosGeneralesTab({ beneficios, onAdd, onEdit, onDelete }: BeneficiosGeneralesTabProps) {
  const { gananciaNetaTotal, recaudadoTotal } = metricsBeneficios(beneficios);

  const categorias = beneficios.map((b) => ({ label: b.nombre, value: b.ingresoBruto }));
  const donutSegments = categorias
    .filter((c) => c.value > 0)
    .map((c, i) => ({ label: c.label, value: c.value, color: categoryColor(i) }));
  const donutTotal = donutSegments.reduce((a, s) => a + s.value, 0);

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MoneyHeroCard type="balance" label="Recaudado bruto de eventos" value={recaudadoTotal} />
        <MoneyHeroCard type="balance" label="Ganancia neta de eventos" value={gananciaNetaTotal} />
      </div>
      <p className="mb-6 text-xs text-fg-tertiary">
        Bruto es lo recaudado antes de gastos; neto ya descuenta los gastos de cada evento.
      </p>

      <CategoryGrid categories={categorias} />

      {donutSegments.length > 0 && (
        <CategoryDonut
          title="Distribución por evento"
          segments={donutSegments}
          totalLabel={`$${donutTotal.toLocaleString("es-AR")}`}
          totalCaption="Recaudado"
        />
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Movimientos</h2>
        <Button onClick={onAdd}>+ Nuevo beneficio</Button>
      </div>

      <MovimientosTable
        title=""
        movimientos={beneficios.map((b) => ({
          id: b.id,
          concepto: b.nombre,
          categoria: "Evento",
          fechaIso: b.fechaIso,
          monto: b.ingresoBruto,
          registradoPor: b.registradoPor,
        }))}
        emptyLabel="Sin beneficios generales registrados."
        actions={(m) => {
          const beneficio = beneficios.find((b) => b.id === m.id)!;
          return (
            <>
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(beneficio)} aria-label="Editar">
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onDelete(beneficio)} aria-label="Eliminar">
                <Trash2 className="size-4 text-danger" />
              </Button>
            </>
          );
        }}
      />
    </div>
  );
}
