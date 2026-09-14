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

interface AsignarCantidadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (cantidad: number) => void;
  vendedorNombre: string;
  error?: string | null;
}

export function AsignarCantidadDialog({ open, onOpenChange, onSubmit, vendedorNombre, error }: AsignarCantidadDialogProps) {
  const [input, setInput] = useState("");
  const cantidad = Number(input);
  const canSubmit = Number.isInteger(cantidad) && cantidad > 0;

  const reset = () => setInput("");

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
          <DialogTitle className="text-lg font-extrabold text-foreground">Asignar cantidad</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">A {vendedorNombre}.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">Cantidad</Label>
            <Input type="number" min={1} value={input} onChange={(e) => setInput(e.target.value)} className="font-mono-num" autoFocus />
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={() => canSubmit && onSubmit(cantidad)} disabled={!canSubmit} className="flex-1">
            Asignar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
