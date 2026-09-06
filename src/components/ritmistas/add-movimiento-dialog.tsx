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
import type { MovimientoTipo, MovimientoEstado } from "@/lib/types";

const TIPOS: { value: MovimientoTipo; label: string }[] = [
  { value: "traje", label: "Traje" },
  { value: "remera", label: "Remera" },
  { value: "rifa", label: "Rifa" },
  { value: "pago", label: "Pago" },
  { value: "ajuste", label: "Ajuste" },
];

const ESTADOS: MovimientoEstado[] = ["Pagado", "Pendiente", "Parcial"];

interface AddMovimientoDialogProps {
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

export function AddMovimientoDialog({ open, onOpenChange, onCreate }: AddMovimientoDialogProps) {
  const [tipo, setTipo] = useState<MovimientoTipo>("pago");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fechaIso, setFechaIso] = useState(todayIso());
  const [estado, setEstado] = useState<MovimientoEstado>("Pagado");

  const canSubmit = concepto.trim().length > 0 && Number(monto) > 0 && fechaIso.length > 0;

  const reset = () => {
    setTipo("pago");
    setConcepto("");
    setMonto("");
    setFechaIso(todayIso());
    setEstado("Pagado");
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({
      tipo,
      concepto: concepto.trim(),
      fechaIso,
      monto: Number(monto),
      estado,
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
          <DialogTitle className="text-lg font-extrabold text-foreground">Registrar pago</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Se agrega como movimiento de cuenta corriente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Tipo">
              <Select value={tipo} onValueChange={(v) => setTipo(v as MovimientoTipo)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={estado} onValueChange={(v) => setEstado(v as MovimientoEstado)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Concepto">
            <Input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Traje de Caixa"
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
            Guardar movimiento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
