"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/ritmistas-utils";
import { MetricCard } from "./metric-card";
import { InstrumentoVariantesTable, RepuestoVariantesTable } from "@/components/inventario/inventario-group-ficha";
import type { ProyeccionGrupo } from "@/lib/presupuesto-actions";
import type { Instrumento, Repuesto } from "@/lib/types";

interface RepuestosProyectadoTabProps {
  urgente: ProyeccionGrupo;
  deseable: ProyeccionGrupo;
  total: number;
  instrumentos: Instrumento[];
  repuestos: Repuesto[];
  onAddInstrumento: () => void;
  onAddRepuesto: () => void;
  onEditInstrumento: (i: Instrumento) => void;
  onDeleteInstrumento: (i: Instrumento) => void;
  onEditRepuesto: (r: Repuesto) => void;
  onDeleteRepuesto: (r: Repuesto) => void;
}

function GrupoTable({ titulo, grupo }: { titulo: string; grupo: ProyeccionGrupo }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{titulo}</h2>
      <div className="overflow-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Costo estimado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupo.items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium text-foreground">{i.nombre}</TableCell>
                <TableCell className="text-right font-mono-num">
                  {i.costoEstimado != null ? formatMoney(i.costoEstimado) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {grupo.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-fg-tertiary">
                  Sin ítems en esta prioridad.
                </TableCell>
              </TableRow>
            )}
            <TableRow className="hover:bg-transparent">
              <TableCell className="font-semibold text-foreground">Subtotal</TableCell>
              <TableCell className="text-right font-mono-num font-semibold text-foreground">
                {formatMoney(grupo.total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function RepuestosProyectadoTab({
  urgente,
  deseable,
  total,
  instrumentos,
  repuestos,
  onAddInstrumento,
  onAddRepuesto,
  onEditInstrumento,
  onDeleteInstrumento,
  onEditRepuesto,
  onDeleteRepuesto,
}: RepuestosProyectadoTabProps) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg-secondary">
          Necesidades de instrumentos y repuestos marcadas en Inventario, agrupadas por prioridad.
        </p>
        <Link href="/inventario" className="text-[13px] font-semibold text-primary hover:underline">
          Editar en Inventario
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <MetricCard label="Urgente" value={formatMoney(urgente.total)} colorClassName="text-danger" />
        <MetricCard label="Deseable" value={formatMoney(deseable.total)} colorClassName="text-warning" />
        <MetricCard label="Total proyectado" value={formatMoney(total)} accent />
      </div>

      <div className="mb-6 flex flex-col gap-6">
        <GrupoTable titulo="Urgente" grupo={urgente} />
        <GrupoTable titulo="Deseable" grupo={deseable} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Instrumentos</h2>
        <Button onClick={onAddInstrumento}>+ Agregar instrumento</Button>
      </div>
      <div className="mb-6">
        <InstrumentoVariantesTable items={instrumentos} onEdit={onEditInstrumento} onDelete={onDeleteInstrumento} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Repuestos</h2>
        <Button onClick={onAddRepuesto}>+ Agregar repuesto</Button>
      </div>
      <RepuestoVariantesTable items={repuestos} onEdit={onEditRepuesto} onDelete={onDeleteRepuesto} />
    </div>
  );
}
