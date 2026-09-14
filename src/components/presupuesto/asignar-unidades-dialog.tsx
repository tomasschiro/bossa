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
import type { BeneficioDistribuidoUnidad } from "@/lib/types";

interface AsignarUnidadesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (numeros: number[]) => void;
  unidadesDisponibles: BeneficioDistribuidoUnidad[];
  vendedorNombre: string;
  error?: string | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">{label}</Label>
      {children}
    </div>
  );
}

function parseNumeros(input: string, disponibles: Set<number>): number[] | null {
  const numeros = new Set<number>();
  for (const parte of input.split(",").map((p) => p.trim()).filter(Boolean)) {
    const rango = parte.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rango) {
      const desde = Number(rango[1]);
      const hasta = Number(rango[2]);
      if (desde > hasta) return null;
      for (let n = desde; n <= hasta; n++) numeros.add(n);
    } else if (/^\d+$/.test(parte)) {
      numeros.add(Number(parte));
    } else {
      return null;
    }
  }
  if (numeros.size === 0) return null;
  for (const n of numeros) if (!disponibles.has(n)) return null;
  return [...numeros];
}

export function AsignarUnidadesDialog({ open, onOpenChange, onSubmit, unidadesDisponibles, vendedorNombre, error }: AsignarUnidadesDialogProps) {
  const [input, setInput] = useState("");
  const disponibles = new Set(unidadesDisponibles.filter((u) => u.estado === "Sin asignar").map((u) => u.numero));
  const numeros = parseNumeros(input, disponibles);
  const canSubmit = numeros !== null && numeros.length > 0;

  const reset = () => setInput("");

  const handleSubmit = () => {
    if (!numeros) return;
    onSubmit(numeros);
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
          <DialogTitle className="text-lg font-extrabold text-foreground">Asignar números</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">A {vendedorNombre}.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Números (rango o lista)">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej. 1-10, 15, 20-25"
              className="font-mono-num"
            />
            <p className="mt-1.5 text-xs text-fg-secondary">{disponibles.size} números sin asignar.</p>
          </Field>

          {input.trim().length > 0 && numeros === null && (
            <p className="text-xs font-medium text-danger">Formato inválido o hay números ya asignados/fuera de rango.</p>
          )}
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            Asignar {numeros ? `(${numeros.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
