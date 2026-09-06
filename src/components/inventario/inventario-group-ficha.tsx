"use client";

import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoBadge } from "./estado-badge";
import { EtiquetaBadge } from "./etiqueta-badge";
import type { Instrumento, InstrumentoEstado, Repuesto } from "@/lib/types";

interface InstrumentoGroupFichaProps {
  tab: "instrumentos";
  name: string;
  items: Instrumento[];
  onBack: () => void;
  onAdd: () => void;
  onEdit: (item: Instrumento) => void;
  onDelete: (item: Instrumento) => void;
}

interface RepuestoGroupFichaProps {
  tab: "repuestos";
  name: string;
  items: Repuesto[];
  onBack: () => void;
  onAdd: () => void;
  onEdit: (item: Repuesto) => void;
  onDelete: (item: Repuesto) => void;
}

type InventarioGroupFichaProps = InstrumentoGroupFichaProps | RepuestoGroupFichaProps;

function initialsFor(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ]/g, "").slice(0, 2).toUpperCase();
}

function MetricCard({
  label,
  value,
  accent,
  colorClassName,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  colorClassName?: string;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-xl border border-transparent bg-primary/10 p-4"
          : "rounded-xl border border-border bg-card p-4"
      }
    >
      <div className="mb-1.5 text-[12px] font-semibold text-fg-secondary">{label}</div>
      <div className={`font-mono-num text-[28px] font-semibold ${colorClassName ?? "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

const ESTADO_COLOR_CLASS: Record<InstrumentoEstado, string> = {
  Bueno: "text-success",
  Regular: "text-warning",
  "Necesita reparación": "text-warning",
  "De baja": "text-danger",
};

export function InventarioGroupFicha(props: InventarioGroupFichaProps) {
  const { name, onBack, onAdd, items } = props;
  const isInstrumentos = props.tab === "instrumentos";
  const total = items.reduce((s, i) => s + i.cantidad, 0);

  const metricCards = isInstrumentos
    ? Object.entries(
        (items as Instrumento[]).reduce<Record<string, number>>((acc, i) => {
          acc[i.estado] = (acc[i.estado] ?? 0) + i.cantidad;
          return acc;
        }, {}),
      ).map(([estado, value]) => ({
        label: estado,
        value,
        colorClassName: ESTADO_COLOR_CLASS[estado as InstrumentoEstado],
      }))
    : [{ label: "Variantes", value: items.length, colorClassName: undefined }];

  const subtitle = `${items.length} ${items.length === 1 ? "variante" : "variantes"} en stock`;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-fg-secondary hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a Inventario
      </button>

      <div className="mb-5 flex flex-wrap items-center gap-3.5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-[14px] font-semibold text-foreground">
          {initialsFor(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xl font-extrabold text-foreground">{name}</div>
          <div className="text-[13px] text-fg-secondary">{subtitle}</div>
        </div>
        <Button onClick={onAdd}>{isInstrumentos ? "+ Agregar variante" : "+ Agregar repuesto"}</Button>
      </div>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <MetricCard label="Total en stock" value={total} accent />
        {metricCards.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} colorClassName={m.colorClassName} />
        ))}
      </div>

      <div className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-fg-secondary uppercase">
        Variantes en stock
      </div>

      {isInstrumentos ? (
        <InstrumentoVariantesTable
          items={items as Instrumento[]}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />
      ) : (
        <RepuestoVariantesTable
          items={items as Repuesto[]}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />
      )}
    </div>
  );
}

function InstrumentoVariantesTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Instrumento[];
  onEdit: (i: Instrumento) => void;
  onDelete: (i: Instrumento) => void;
}) {
  return (
    <>
      <div className="hidden overflow-auto rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Marca</TableHead>
              <TableHead>Pulgadas</TableHead>
              <TableHead>Tipo de caixa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium text-foreground">{i.marca ?? "—"}</TableCell>
                <TableCell className="font-mono-num">{i.pulgadas ?? "—"}</TableCell>
                <TableCell className="text-fg-secondary">
                  {i.tipo === "Caixa" ? (i.tipoCaixa ?? "—") : "—"}
                </TableCell>
                <TableCell>
                  <EstadoBadge estado={i.estado} />
                </TableCell>
                <TableCell className="text-right font-mono-num">{i.cantidad}</TableCell>
                <TableCell>
                  <EtiquetaBadge etiqueta={i.etiqueta} prioridad={i.prioridad} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(i)} aria-label="Editar">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => onDelete(i)} aria-label="Eliminar">
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border md:hidden">
        {items.map((i) => (
          <div key={i.id} className="flex items-start justify-between gap-3 bg-card p-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">
                {[i.marca, i.pulgadas].filter(Boolean).join(" ") || "—"}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <EstadoBadge estado={i.estado} />
                <EtiquetaBadge etiqueta={i.etiqueta} prioridad={i.prioridad} />
              </div>
              <div className="mt-1.5 text-xs text-fg-secondary">Cantidad: {i.cantidad}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(i)} aria-label="Editar">
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onDelete(i)} aria-label="Eliminar">
                <Trash2 className="size-4 text-danger" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RepuestoVariantesTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Repuesto[];
  onEdit: (r: Repuesto) => void;
  onDelete: (r: Repuesto) => void;
}) {
  return (
    <>
      <div className="hidden overflow-auto rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-foreground">{r.descripcion}</TableCell>
                <TableCell className="text-right font-mono-num">{r.cantidad}</TableCell>
                <TableCell>
                  <EtiquetaBadge etiqueta={r.etiqueta} prioridad={r.prioridad} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)} aria-label="Editar">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => onDelete(r)} aria-label="Eliminar">
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border md:hidden">
        {items.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 bg-card p-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">{r.descripcion}</div>
              <div className="mt-1">
                <EtiquetaBadge etiqueta={r.etiqueta} prioridad={r.prioridad} />
              </div>
              <div className="mt-1.5 text-xs text-fg-secondary">Cantidad: {r.cantidad}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)} aria-label="Editar">
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onDelete(r)} aria-label="Eliminar">
                <Trash2 className="size-4 text-danger" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
