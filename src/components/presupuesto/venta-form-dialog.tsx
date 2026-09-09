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

interface VentaFormValues {
  unidades?: number | null;
  montoDirecto?: number | null;
  fechaIso: string;
}

interface VentaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: VentaFormValues) => void;
  precioUnidad: number;
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function VentaFormDialog({ open, onOpenChange, onSubmit, precioUnidad, error }: VentaFormDialogProps) {
  const [modo, setModo] = useState<"unidades" | "monto">("unidades");
  const [unidades, setUnidades] = useState("1");
  const [montoDirecto, setMontoDirecto] = useState("");
  const [fechaIso, setFechaIso] = useState(today());

  const unidadesNum = parseInt(unidades, 10);
  const montoNum = Number(montoDirecto);
  const preview = modo === "unidades" && Number.isFinite(unidadesNum) ? unidadesNum * precioUnidad : null;

  const canSubmit =
    fechaIso.length > 0 &&
    (modo === "unidades" ? Number.isFinite(unidadesNum) && unidadesNum > 0 : Number.isFinite(montoNum) && montoNum > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      unidades: modo === "unidades" ? unidadesNum : null,
      montoDirecto: modo === "monto" ? montoNum : null,
      fechaIso,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Registrar venta</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">Por unidades o por monto directo.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant={modo === "unidades" ? "default" : "outline"}
              className={modo === "unidades" ? "" : "bg-card"}
              onClick={() => setModo("unidades")}
            >
              Unidades
            </Button>
            <Button
              type="button"
              variant={modo === "monto" ? "default" : "outline"}
              className={modo === "monto" ? "" : "bg-card"}
              onClick={() => setModo("monto")}
            >
              Monto directo
            </Button>
          </div>

          {modo === "unidades" ? (
            <Field label="Unidades vendidas">
              <Input type="number" min={1} value={unidades} onChange={(e) => setUnidades(e.target.value)} className="font-mono-num" />
              {preview != null && (
                <p className="mt-1.5 text-xs text-fg-secondary">Total: {formatMoney(preview)}</p>
              )}
            </Field>
          ) : (
            <Field label="Monto">
              <Input type="number" value={montoDirecto} onChange={(e) => setMontoDirecto(e.target.value)} placeholder="0" className="font-mono-num" />
            </Field>
          )}

          <Field label="Fecha">
            <Input type="date" value={fechaIso} onChange={(e) => setFechaIso(e.target.value)} className="font-mono-num" />
          </Field>

          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            Guardar venta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
