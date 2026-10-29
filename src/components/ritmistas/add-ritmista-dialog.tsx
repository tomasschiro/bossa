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
import { cn } from "cn";
import { NaipeVarianteSelect } from "./naipe-variante-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TALLES_CALZADO, type Naipe, type Nivel } from "@/lib/types";
import type { Ritmista } from "@/lib/types";
import { formatDni, formatTelefono } from "@/lib/ritmistas-utils";
import { emailValido, esMenor } from "@/lib/inscripcion-utils";
import { hoyArgentina } from "@/lib/agenda-utils";

interface AddRitmistaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (ritmista: Omit<Ritmista, "id" | "historial">) => void;
  variantesPorNaipe: Record<string, string[]>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">{label}</Label>
      {children}
    </div>
  );
}

export function AddRitmistaDialog({ open, onOpenChange, onCreate, variantesPorNaipe }: AddRitmistaDialogProps) {
  const NAIPES = useNaipes();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nacimientoIso, setNacimientoIso] = useState("");
  const [naipeRef, setNaipeRef] = useState<string>(NAIPES[0] ?? "");
  const [nivel, setNivel] = useState<Nivel>("Avanzado");
  const [talleRemera, setTalleRemera] = useState("");
  const [calzado, setCalzado] = useState("");
  const [email, setEmail] = useState("");
  const [telefonoTutor, setTelefonoTutor] = useState("");

  const menor = esMenor(nacimientoIso, hoyArgentina());
  const emailInvalido = email.trim().length > 0 && !emailValido(email.trim());
  const canSubmit = naipeRef.trim().length > 0 && nombre.trim().length > 0 && apellido.trim().length > 0 && !emailInvalido;

  const reset = () => {
    setNombre("");
    setApellido("");
    setDni("");
    setTelefono("");
    setNacimientoIso("");
    setNaipeRef(NAIPES[0] ?? "");
    setNivel("Avanzado");
    setTalleRemera("");
    setCalzado("");
    setEmail("");
    setTelefonoTutor("");
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni,
      telefono,
      nacimientoIso,
      nivel,
      talleRemera,
      calzado,
      email: email.trim(),
      telefonoTutor: menor ? telefonoTutor : "",
      naipeReferencia: naipeRef as Naipe,
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
                onChange={(e) => setDni(formatDni(e.target.value))}
                placeholder="00.000.000"
                className="font-mono-num"
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={telefono}
                onChange={(e) => setTelefono(formatTelefono(e.target.value))}
                placeholder="3772-441826"
                className="font-mono-num"
              />
            </Field>
          </div>

          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@mail.com"
              aria-invalid={emailInvalido || undefined}
            />
            {emailInvalido && <p className="mt-1.5 text-[12.5px] text-danger">Revisá el formato del mail.</p>}
          </Field>

          <Field label="Fecha de nacimiento">
            <Input
              type="date"
              value={nacimientoIso}
              onChange={(e) => setNacimientoIso(e.target.value)}
              className="font-mono-num"
            />
          </Field>

          {menor && (
            <Field label="Teléfono del tutor">
              <Input
                value={telefonoTutor}
                onChange={(e) => setTelefonoTutor(formatTelefono(e.target.value))}
                placeholder="3772-441826"
                className="font-mono-num"
              />
            </Field>
          )}

          <Field label="Instrumento">
            <NaipeVarianteSelect value={naipeRef} onChange={setNaipeRef} variantesPorNaipe={variantesPorNaipe} />
          </Field>

          <Field label="Nivel">
            <div className="grid grid-cols-2 gap-2.5">
              {(["Avanzado", "Principiante"] as Nivel[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setNivel(opt)}
                  aria-pressed={nivel === opt}
                  className={cn(
                    "h-10 rounded-lg border text-sm font-semibold transition-colors",
                    nivel === opt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-fg-secondary hover:bg-bg-subtle",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Field>

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
              <Select value={calzado} onValueChange={setCalzado}>
                <SelectTrigger className="w-full font-mono-num">
                  <SelectValue placeholder="Talle" />
                </SelectTrigger>
                <SelectContent>
                  {TALLES_CALZADO.map((talle) => (
                    <SelectItem key={talle} value={talle}>{talle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
