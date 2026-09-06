"use client";
import { useNaipes } from "@/components/naipes/naipes-context";

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
import { type Naipe } from "@/lib/types";
import type { Ritmista } from "@/lib/types";

const SUBTIPOS: Partial<Record<Naipe, string[]>> = {
  Caixas: ['12"', '14"'],
  Repiques: ['12"', '14"', '16"'],
  Surdos: ["1ra", "2da", "3ra"],
};

interface AddRitmistaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (ritmista: Omit<Ritmista, "id" | "historial">) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">{label}</Label>
      {children}
    </div>
  );
}

export function AddRitmistaDialog({ open, onOpenChange, onCreate }: AddRitmistaDialogProps) {
  const NAIPES = useNaipes();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nacimientoIso, setNacimientoIso] = useState("");
  const [naipe, setNaipe] = useState<Naipe>(NAIPES[0] ?? "");
  const [subtipo, setSubtipo] = useState("");
  const [talleRemera, setTalleRemera] = useState("");
  const [calzado, setCalzado] = useState("");

  const subtipoOptions = SUBTIPOS[naipe] ?? [];
  const canSubmit = NAIPES.includes(naipe) && nombre.trim().length > 0 && apellido.trim().length > 0;

  const reset = () => {
    setNombre("");
    setApellido("");
    setDni("");
    setTelefono("");
    setNacimientoIso("");
    setNaipe(NAIPES[0] ?? "");
    setSubtipo("");
    setTalleRemera("");
    setCalzado("");
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni,
      telefono,
      nacimientoIso,
      nivel: "Principiante",
      talleRemera,
      calzado,
      naipeReferencia: naipe,
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
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Nuevo ritmista</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Se agrega al padrón general y a la edición activa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Nombre y apellido">
            <div className="grid grid-cols-2 gap-2.5">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />
              <Input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="DNI">
              <Input
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="00.000.000"
                className="font-mono-num"
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="341 000 0000"
                className="font-mono-num"
              />
            </Field>
          </div>

          <Field label="Fecha de nacimiento">
            <Input
              type="date"
              value={nacimientoIso}
              onChange={(e) => setNacimientoIso(e.target.value)}
              className="font-mono-num"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Instrumento">
              <Select
                value={naipe}
                onValueChange={(v) => {
                  setNaipe(v as Naipe);
                  setSubtipo("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NAIPES.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {subtipoOptions.length > 0 ? (
              <Field label="Subcategoría">
                <Select value={subtipo} onValueChange={setSubtipo}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {subtipoOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <div />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Talle de remera">
              <Input
                value={talleRemera}
                onChange={(e) => setTalleRemera(e.target.value)}
                placeholder="M"
                className="font-mono-num"
              />
            </Field>
            <Field label="Calzado">
              <Input
                value={calzado}
                onChange={(e) => setCalzado(e.target.value)}
                placeholder="38"
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
            Guardar ritmista
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
