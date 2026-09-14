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

interface AddAjusteDialogProps {
  open: boolean;
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

export function AddAjusteDialog({ open, onOpenChange, onCreate }: AddAjusteDialogProps) {
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fechaIso, setFechaIso] = useState(todayIso());

  const canSubmit = concepto.trim().length > 0 && Number(monto) > 0 && fechaIso.length > 0;

  const reset = () => {
    setConcepto("");
    setMonto("");
    setFechaIso(todayIso());
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({
      tipo: "ajuste",
      concepto: concepto.trim(),
      fechaIso,
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
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Cargar ajuste</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Corrección manual de la cuenta corriente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Concepto">
            <Input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Corrección de saldo"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Monto">
              <Input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                className="font-mono-num"
              />
            </Field>
            <Field label="Fecha">
              <Input
                type="date"
                value={fechaIso}
                onChange={(e) => setFechaIso(e.target.value)}
                className="font-mono-num"
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            Guardar ajuste
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
