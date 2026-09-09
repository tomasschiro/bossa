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
import { CAJA_CATEGORIAS, type CajaCategoriaUI } from "@/lib/types";

interface TraspasoFormValues {
  categoriaOrigen: CajaCategoriaUI;
  categoriaDestino: CajaCategoriaUI;
  monto: number;
  concepto?: string;
}

interface TraspasoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TraspasoFormValues) => void;
  categoriaOrigenInicial: CajaCategoriaUI;
  saldosPorCategoria: Record<string, number>;
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

export function TraspasoFormDialog({
  open,
  onOpenChange,
  onSubmit,
  categoriaOrigenInicial,
  saldosPorCategoria,
  error,
}: TraspasoFormDialogProps) {
  const [categoriaOrigen, setCategoriaOrigen] = useState<CajaCategoriaUI>(categoriaOrigenInicial);
  const [categoriaDestino, setCategoriaDestino] = useState<CajaCategoriaUI>(
    CAJA_CATEGORIAS.find((c) => c !== categoriaOrigenInicial) ?? CAJA_CATEGORIAS[0],
  );
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");

  const saldoOrigen = saldosPorCategoria[categoriaOrigen] ?? 0;
  const montoNum = Number(monto);
  const canSubmit =
    categoriaOrigen !== categoriaDestino &&
    Number.isFinite(montoNum) &&
    montoNum > 0 &&
    montoNum <= saldoOrigen;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ categoriaOrigen, categoriaDestino, monto: montoNum, concepto: concepto.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Asignar / Traspasar</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Reclasifica saldo entre categorías. No cambia el total de la caja.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Origen">
              <Select value={categoriaOrigen} onValueChange={(v) => setCategoriaOrigen(v as CajaCategoriaUI)}>
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
            <Field label="Destino">
              <Select value={categoriaDestino} onValueChange={(v) => setCategoriaDestino(v as CajaCategoriaUI)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAJA_CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c} disabled={c === categoriaOrigen}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <p className="text-[12.5px] text-fg-secondary">
            Saldo disponible en {categoriaOrigen}:{" "}
            <span className="font-mono-num font-semibold text-foreground">
              ${saldoOrigen.toLocaleString("es-AR")}
            </span>
          </p>

          <Field label="Concepto (opcional)">
            <Input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder={`Traspaso ${categoriaOrigen} → ${categoriaDestino}`}
            />
          </Field>

          <Field label="Monto">
            <Input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              className="font-mono-num"
            />
          </Field>

          {(categoriaDestino === "Fantasía/temática" || categoriaDestino === "Remeras") && (
            <p className="text-[12.5px] text-fg-secondary">
              El monto traspasado también se sumará al Estimado de {categoriaDestino === "Fantasía/temática" ? "Fantasía" : "Remeras"}.
            </p>
          )}

          {monto.length > 0 && montoNum > saldoOrigen && (
            <p className="text-[12.5px] font-semibold text-danger">El monto no puede superar el saldo disponible.</p>
          )}
          {error && <p className="text-[12.5px] font-semibold text-danger">{error}</p>}
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            Traspasar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
