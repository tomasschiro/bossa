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
import { Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/ritmistas-utils";
import { calcularSubtotal } from "@/lib/presupuesto-utils";
import type { BeneficioGeneral } from "@/lib/types";

interface BeneficioGastoRow {
  id?: string;
  concepto: string;
  costoUnidad: string;
  cantidad: string;
}

interface BeneficioFormValues {
  nombre: string;
  fechaIso: string;
  objetivoRecaudacion: number | null;
  ingresoBruto: number;
  gastos: { id?: string; concepto: string; costoUnidad: number; cantidad: number }[];
}

interface BeneficioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BeneficioFormValues) => void;
  initialValue?: BeneficioGeneral;
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

export function BeneficioFormDialog({ open, onOpenChange, onSubmit, initialValue }: BeneficioFormDialogProps) {
  const isEdit = !!initialValue;

  const [nombre, setNombre] = useState(initialValue?.nombre ?? "");
  const [fechaIso, setFechaIso] = useState(initialValue?.fechaIso ?? today());
  const [objetivoRecaudacion, setObjetivoRecaudacion] = useState(initialValue?.objetivoRecaudacion?.toString() ?? "");
  const [ingresoBruto, setIngresoBruto] = useState(initialValue?.ingresoBruto?.toString() ?? "");
  const [gastos, setGastos] = useState<BeneficioGastoRow[]>(
    initialValue?.gastos.map((g) => ({ id: g.id, concepto: g.concepto, costoUnidad: g.costoUnidad.toString(), cantidad: g.cantidad.toString() })) ?? [],
  );

  const ingresoBrutoNum = Number(ingresoBruto || "0");
  const canSubmit =
    nombre.trim().length > 0 &&
    fechaIso.length > 0 &&
    Number.isFinite(ingresoBrutoNum) &&
    ingresoBrutoNum >= 0 &&
    gastos.every(
      (g) =>
        g.concepto.trim().length > 0 &&
        Number.isFinite(Number(g.costoUnidad)) &&
        Number(g.costoUnidad) > 0 &&
        Number.isFinite(parseInt(g.cantidad, 10)) &&
        parseInt(g.cantidad, 10) >= 1,
    );

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      nombre: nombre.trim(),
      fechaIso,
      objetivoRecaudacion: objetivoRecaudacion ? Number(objetivoRecaudacion) : null,
      ingresoBruto: ingresoBrutoNum,
      gastos: gastos.map((g) => ({ id: g.id, concepto: g.concepto.trim(), costoUnidad: Number(g.costoUnidad), cantidad: parseInt(g.cantidad, 10) })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">
            {isEdit ? "Editar beneficio" : "Nuevo beneficio"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Se refleja en Agenda y el ingreso bruto en Caja general.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Nombre">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Feria de comidas" />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Fecha">
              <Input type="date" value={fechaIso} onChange={(e) => setFechaIso(e.target.value)} className="font-mono-num" />
            </Field>
            <Field label="Objetivo de recaudación (opcional)">
              <Input
                type="number"
                value={objetivoRecaudacion}
                onChange={(e) => setObjetivoRecaudacion(e.target.value)}
                placeholder="0"
                className="font-mono-num"
              />
            </Field>
          </div>

          <Field label="Ingreso bruto">
            <Input
              type="number"
              value={ingresoBruto}
              onChange={(e) => setIngresoBruto(e.target.value)}
              placeholder="0"
              className="font-mono-num"
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-[12.5px] font-semibold text-fg-secondary">Gastos del evento</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-card"
                onClick={() => setGastos((prev) => [...prev, { concepto: "", costoUnidad: "", cantidad: "1" }])}
              >
                + Agregar gasto
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {gastos.map((g, i) => {
                const costoUnidadNum = Number(g.costoUnidad);
                const cantidadNum = parseInt(g.cantidad, 10);
                const subtotal =
                  Number.isFinite(costoUnidadNum) && Number.isFinite(cantidadNum) ? calcularSubtotal(costoUnidadNum, cantidadNum) : 0;
                return (
                  <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5">
                    <div className="flex gap-2">
                      <Input
                        value={g.concepto}
                        onChange={(e) =>
                          setGastos((prev) => prev.map((row, idx) => (idx === i ? { ...row, concepto: e.target.value } : row)))
                        }
                        placeholder="Concepto"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setGastos((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label="Quitar gasto"
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={g.costoUnidad}
                        onChange={(e) =>
                          setGastos((prev) => prev.map((row, idx) => (idx === i ? { ...row, costoUnidad: e.target.value } : row)))
                        }
                        placeholder="Costo unidad"
                        className="w-28 font-mono-num"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={g.cantidad}
                        onChange={(e) =>
                          setGastos((prev) => prev.map((row, idx) => (idx === i ? { ...row, cantidad: e.target.value } : row)))
                        }
                        placeholder="Cantidad"
                        className="w-20 font-mono-num"
                      />
                      <span className="text-xs text-fg-secondary">
                        Subtotal: <span className="font-mono-num font-semibold text-foreground">{formatMoney(subtotal)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
              {gastos.length === 0 && <p className="text-xs text-fg-tertiary">Sin gastos cargados.</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            {isEdit ? "Guardar cambios" : "Guardar beneficio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
