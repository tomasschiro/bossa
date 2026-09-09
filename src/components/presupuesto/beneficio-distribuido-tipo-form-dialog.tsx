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
import type { BeneficioDistribuidoTipo } from "@/lib/types";

interface TipoFormValues {
  nombre: string;
  precioUnidad: number;
  fechaLimiteIso: string;
}

interface BeneficioDistribuidoTipoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TipoFormValues) => void;
  initialValue?: BeneficioDistribuidoTipo;
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

export function BeneficioDistribuidoTipoFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValue,
}: BeneficioDistribuidoTipoFormDialogProps) {
  const isEdit = !!initialValue;
  const [nombre, setNombre] = useState(initialValue?.nombre ?? "");
  const [precioUnidad, setPrecioUnidad] = useState(initialValue?.precioUnidad?.toString() ?? "");
  const [fechaLimiteIso, setFechaLimiteIso] = useState(initialValue?.fechaLimiteIso ?? today());

  const precioNum = Number(precioUnidad);
  const canSubmit = nombre.trim().length > 0 && Number.isFinite(precioNum) && precioNum > 0 && fechaLimiteIso.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ nombre: nombre.trim(), precioUnidad: precioNum, fechaLimiteIso });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">
            {isEdit ? "Editar tipo" : "Nuevo tipo de beneficio distribuido"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">Ej. Rifa, Bono contribución.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Nombre">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Rifa" />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Precio por unidad">
              <Input
                type="number"
                value={precioUnidad}
                onChange={(e) => setPrecioUnidad(e.target.value)}
                placeholder="0"
                className="font-mono-num"
              />
            </Field>
            <Field label="Fecha límite">
              <Input type="date" value={fechaLimiteIso} onChange={(e) => setFechaLimiteIso(e.target.value)} className="font-mono-num" />
            </Field>
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            {isEdit ? "Guardar cambios" : "Guardar tipo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
