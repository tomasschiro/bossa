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
import { formatMoney } from "@/lib/ritmistas-utils";

interface VenderUnidadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numero: number;
  precioUnidad: number;
  onConfirm: (fechaIso: string) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function VenderUnidadDialog({ open, onOpenChange, numero, precioUnidad, onConfirm }: VenderUnidadDialogProps) {
  const [fechaIso, setFechaIso] = useState(today());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Vender número #{numero}</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Se registra la venta por {formatMoney(precioUnidad)} y se aplica a la deuda del vendedor o a caja general.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">Fecha</Label>
            <Input type="date" value={fechaIso} onChange={(e) => setFechaIso(e.target.value)} className="font-mono-num" />
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(fechaIso);
              onOpenChange(false);
            }}
            className="flex-1"
          >
            Vender
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
