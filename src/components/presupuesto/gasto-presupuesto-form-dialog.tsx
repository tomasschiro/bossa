"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TipoCombobox } from "@/components/inventario/tipo-combobox";
import { formatMoney } from "@/lib/ritmistas-utils";
import { calcularSubtotal } from "@/lib/presupuesto-utils";
import type { PresupuestoGasto } from "@/lib/types";

interface GastoFormValues {
  categoria: string;
  concepto: string;
  costoUnidad: number;
  cantidad: number;
  fechaIso: string;
}

interface GastoPresupuestoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GastoFormValues) => void;
  initialValue?: PresupuestoGasto;
  categoriasFijas?: string[];
  categoriasExistentes?: string[];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">{label}</Label>
      {children}
    </div>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GastoPresupuestoFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValue,
  categoriasFijas,
  categoriasExistentes = [],
}: GastoPresupuestoFormDialogProps) {
  const isEdit = !!initialValue;

  const [categoria, setCategoria] = useState(initialValue?.categoria ?? categoriasFijas?.[0] ?? "");
  const [concepto, setConcepto] = useState(initialValue?.concepto ?? "");
  const [costoUnidad, setCostoUnidad] = useState(initialValue?.costoUnidad?.toString() ?? "");
  const [cantidad, setCantidad] = useState(initialValue?.cantidad?.toString() ?? "1");
  const [fechaIso, setFechaIso] = useState(initialValue?.fechaIso ?? today());

  const costoUnidadNum = Number(costoUnidad);
  const cantidadNum = parseInt(cantidad, 10);
  const subtotal = Number.isFinite(costoUnidadNum) && Number.isFinite(cantidadNum) ? calcularSubtotal(costoUnidadNum, cantidadNum) : 0;
  const canSubmit =
    categoria.trim().length > 0 &&
    concepto.trim().length > 0 &&
    Number.isFinite(costoUnidadNum) &&
    costoUnidadNum > 0 &&
    Number.isFinite(cantidadNum) &&
    cantidadNum >= 1 &&
    fechaIso.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ categoria: categoria.trim(), concepto: concepto.trim(), costoUnidad: costoUnidadNum, cantidad: cantidadNum, fechaIso });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">
            {isEdit ? "Editar gasto" : "Nuevo gasto"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Este gasto también se refleja como egreso en Caja general.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Categoría">
            {categoriasFijas ? (
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoriasFijas.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <TipoCombobox
                value={categoria}
                onChange={setCategoria}
                options={categoriasExistentes}
                placeholder="Seleccionar o crear categoría"
                searchPlaceholder="Buscar o crear categoría..."
              />
            )}
          </Field>

          <Field label="Nombre del ítem">
            <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej. Tela dorada" />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Costo por unidad">
              <Input type="number" value={costoUnidad} onChange={(e) => setCostoUnidad(e.target.value)} placeholder="0" className="font-mono-num" />
            </Field>
            <Field label="Cantidad">
              <Input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="font-mono-num" />
            </Field>
          </div>

          <Field label="Fecha">
            <Input type="date" value={fechaIso} onChange={(e) => setFechaIso(e.target.value)} className="font-mono-num" />
          </Field>

          <div className="rounded-lg bg-bg-subtle px-3.5 py-2.5 text-sm text-fg-secondary">
            Subtotal: <span className="font-mono-num font-semibold text-foreground">{formatMoney(subtotal)}</span>
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            {isEdit ? "Guardar cambios" : "Guardar gasto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
