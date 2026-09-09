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
import type { RitmistaOpcion } from "@/lib/types";

interface VendedorFormValues {
  ritmistaEdicionId?: string | null;
  nombreExterno?: string | null;
  contactoExterno?: string | null;
  unidadesAsignadas: number;
}

interface VendedorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: VendedorFormValues) => void;
  ritmistas: RitmistaOpcion[];
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

export function VendedorFormDialog({ open, onOpenChange, onSubmit, ritmistas, error }: VendedorFormDialogProps) {
  const [modo, setModo] = useState<"ritmista" | "externo">("ritmista");
  const [ritmistaEdicionId, setRitmistaEdicionId] = useState(ritmistas[0]?.ritmistaEdicionId ?? "");
  const [nombreExterno, setNombreExterno] = useState("");
  const [contactoExterno, setContactoExterno] = useState("");
  const [unidadesAsignadas, setUnidadesAsignadas] = useState("0");

  const unidadesNum = parseInt(unidadesAsignadas, 10);
  const canSubmit =
    (modo === "ritmista" ? !!ritmistaEdicionId : nombreExterno.trim().length > 0) &&
    Number.isFinite(unidadesNum) &&
    unidadesNum >= 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      ritmistaEdicionId: modo === "ritmista" ? ritmistaEdicionId : null,
      nombreExterno: modo === "externo" ? nombreExterno.trim() : null,
      contactoExterno: modo === "externo" ? contactoExterno.trim() || null : null,
      unidadesAsignadas: unidadesNum,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Nuevo vendedor</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Un ritmista de la edición o un colaborador externo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant={modo === "ritmista" ? "default" : "outline"}
              className={modo === "ritmista" ? "" : "bg-card"}
              onClick={() => setModo("ritmista")}
            >
              Ritmista
            </Button>
            <Button
              type="button"
              variant={modo === "externo" ? "default" : "outline"}
              className={modo === "externo" ? "" : "bg-card"}
              onClick={() => setModo("externo")}
            >
              Externo
            </Button>
          </div>

          {modo === "ritmista" ? (
            <Field label="Ritmista">
              <Select value={ritmistaEdicionId} onValueChange={setRitmistaEdicionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar ritmista" />
                </SelectTrigger>
                <SelectContent>
                  {ritmistas.map((r) => (
                    <SelectItem key={r.ritmistaEdicionId} value={r.ritmistaEdicionId}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <>
              <Field label="Nombre">
                <Input value={nombreExterno} onChange={(e) => setNombreExterno(e.target.value)} placeholder="Nombre del colaborador" />
              </Field>
              <Field label="Contacto (opcional)">
                <Input value={contactoExterno} onChange={(e) => setContactoExterno(e.target.value)} placeholder="Teléfono o email" />
              </Field>
            </>
          )}

          <Field label="Unidades asignadas">
            <Input
              type="number"
              min={0}
              value={unidadesAsignadas}
              onChange={(e) => setUnidadesAsignadas(e.target.value)}
              className="font-mono-num"
            />
          </Field>

          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            Guardar vendedor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
