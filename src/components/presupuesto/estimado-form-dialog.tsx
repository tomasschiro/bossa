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

interface EstimadoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (montoEstimado: number) => void;
  initialValue: number;
}

export function EstimadoFormDialog({ open, onOpenChange, onSubmit, initialValue }: EstimadoFormDialogProps) {
  const [monto, setMonto] = useState(initialValue.toString());
  const montoNum = Number(monto);
  const canSubmit = Number.isFinite(montoNum) && montoNum >= 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(montoNum);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Monto estimado</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Presupuesto total previsto para este rubro.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5">
          <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">Monto estimado</Label>
          <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" className="font-mono-num" />
        </div>
        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
