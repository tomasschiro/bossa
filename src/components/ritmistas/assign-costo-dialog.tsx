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
import type { MovimientoTipo, MovimientoEstado } from "@/lib/types";

interface AssignCostoDialogProps {
  open: boolean;
  tipo: Extract<MovimientoTipo, "traje" | "remera"> | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    tipo: MovimientoTipo;
    concepto: string;
    fechaIso: string;
    monto: number;
    estado: MovimientoEstado;
  }) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">{label}</Label>
      {children}
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const CONCEPTO_POR_TIPO: Record<"traje" | "remera", string> = {
  traje: "Traje",
  remera: "Remera",
};

export function AssignCostoDialog({ open, tipo, onOpenChange, onCreate }: AssignCostoDialogProps) {
  const [monto, setMonto] = useState("");

  const canSubmit = !!tipo && Number(monto) > 0;

  const reset = () => setMonto("");

  const handleSubmit = () => {
    if (!tipo || !canSubmit) return;
    onCreate({
      tipo,
      concepto: CONCEPTO_POR_TIPO[tipo],
      fechaIso: todayIso(),
      monto: Number(monto),
      estado: "Pendiente",
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">
            Asignar costo · {tipo ? CONCEPTO_POR_TIPO[tipo] : ""}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Se suma como deuda a la cuenta corriente del ritmista.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Monto">
            <Input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              className="font-mono-num"
              autoFocus
            />
          </Field>
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            Guardar costo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
