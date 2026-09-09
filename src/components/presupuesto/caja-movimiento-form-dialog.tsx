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
import { CAJA_CATEGORIAS, type CajaCategoriaUI, type CajaMovimientoTipo } from "@/lib/types";

interface CajaMovimientoFormValues {
  tipo: CajaMovimientoTipo;
  categoria: CajaCategoriaUI;
  concepto: string;
  monto: number;
  fechaIso: string;
}

interface CajaMovimientoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CajaMovimientoFormValues) => void;
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

export function CajaMovimientoFormDialog({ open, onOpenChange, onSubmit }: CajaMovimientoFormDialogProps) {
  const [tipo, setTipo] = useState<CajaMovimientoTipo>("ingreso");
  const [categoria, setCategoria] = useState<CajaCategoriaUI>(CAJA_CATEGORIAS[0]);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fechaIso, setFechaIso] = useState(today());

  const montoNum = Number(monto);
  const canSubmit = concepto.trim().length > 0 && Number.isFinite(montoNum) && montoNum > 0 && fechaIso.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ tipo, categoria, concepto: concepto.trim(), monto: montoNum, fechaIso });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Carga libre</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Ingreso o egreso directo a la caja general.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Tipo">
              <Select value={tipo} onValueChange={(v) => setTipo(v as CajaMovimientoTipo)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                  <SelectItem value="egreso">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Destino">
              <Select value={categoria} onValueChange={(v) => setCategoria(v as CajaCategoriaUI)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAJA_CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
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
              placeholder="Ej. Sponsor — Ferretería Pérez"
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
              <Input type="date" value={fechaIso} onChange={(e) => setFechaIso(e.target.value)} className="font-mono-num" />
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
