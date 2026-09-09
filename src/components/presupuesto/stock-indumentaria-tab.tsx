"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { metricsStock } from "@/lib/presupuesto-utils";
import { MetricCard } from "./metric-card";
import { CategoryDonut } from "./category-donut";
import type { StockIndumentaria } from "@/lib/types";

interface StockIndumentariaTabProps {
  stock: StockIndumentaria[];
  onGuardar: (talle: string, cantidadStock: number) => void;
}

function StockInput({ talle, cantidadStock, onGuardar }: { talle: string; cantidadStock: number; onGuardar: (talle: string, cantidadStock: number) => void }) {
  const [value, setValue] = useState(cantidadStock.toString());
  return (
    <Input
      type="number"
      min={0}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const num = Math.trunc(Number(value));
        if (Number.isFinite(num) && num >= 0) onGuardar(talle, num);
      }}
      className="w-24 font-mono-num"
    />
  );
}

export function StockIndumentariaTab({ stock, onGuardar }: StockIndumentariaTabProps) {
  const { tallesConFaltante, entregasPendientesTotales } = metricsStock(stock);
  const totalEntregado = stock.reduce((sum, s) => sum + s.cantidadEntregada, 0);
  const totalRemeras = totalEntregado + entregasPendientesTotales;

  const donutSegments = [
    { label: "Entregadas", value: totalEntregado, color: "var(--success)" },
    { label: "Pendientes", value: entregasPendientesTotales, color: "var(--warning)" },
  ].filter((s) => s.value > 0);

  return (
    <div>
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <MetricCard label="Total remeras" value={totalRemeras} accent />
        <MetricCard label="Entregadas" value={totalEntregado} colorClassName="text-success" />
        <MetricCard label="Talles con faltante" value={tallesConFaltante} colorClassName={tallesConFaltante > 0 ? "text-danger" : undefined} />
        <MetricCard label="Entregas pendientes" value={entregasPendientesTotales} colorClassName={entregasPendientesTotales > 0 ? "text-warning" : undefined} />
      </div>

      {donutSegments.length > 0 && (
        <CategoryDonut
          title="Distribución"
          segments={donutSegments}
          totalLabel={String(totalRemeras)}
          totalCaption="Remeras"
          formatValue={String}
        />
      )}

      <h2 className="mb-3 text-sm font-semibold text-foreground">Talles y entregas</h2>

      <div className="mb-4 hidden overflow-auto rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Talle</TableHead>
              <TableHead>Disponible</TableHead>
              <TableHead className="text-right">Entregada</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead>Progreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.map((s) => {
              const pct = s.cantidadStock > 0 ? Math.min(100, Math.round((s.cantidadEntregada / s.cantidadStock) * 100)) : 0;
              return (
                <TableRow key={s.talle}>
                  <TableCell className="font-medium text-foreground">{s.talle}</TableCell>
                  <TableCell>
                    <StockInput talle={s.talle} cantidadStock={s.cantidadStock} onGuardar={onGuardar} />
                  </TableCell>
                  <TableCell className="text-right font-mono-num text-fg-secondary">{s.cantidadEntregada}</TableCell>
                  <TableCell className="text-right font-mono-num text-fg-secondary">{s.cantidadPendiente}</TableCell>
                  <TableCell>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg-subtle">
                      <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {stock.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-fg-tertiary">
                  Sin talles registrados todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border md:hidden">
        {stock.map((s) => {
          const pct = s.cantidadStock > 0 ? Math.min(100, Math.round((s.cantidadEntregada / s.cantidadStock) * 100)) : 0;
          return (
            <div key={s.talle} className="flex flex-col gap-2 bg-card p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Talle {s.talle}</div>
                  <div className="mt-1 text-xs text-fg-secondary">
                    Entregada: {s.cantidadEntregada} · Pendiente: {s.cantidadPendiente}
                  </div>
                </div>
                <StockInput talle={s.talle} cantidadStock={s.cantidadStock} onGuardar={onGuardar} />
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {stock.length === 0 && <div className="bg-card p-4 text-center text-sm text-fg-tertiary">Sin talles registrados todavía.</div>}
      </div>
    </div>
  );
}
