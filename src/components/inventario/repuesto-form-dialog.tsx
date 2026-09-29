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
import { TipoCombobox } from "./tipo-combobox";
import { type CategoriaRepuesto, type ItemEtiqueta, type ItemPrioridad, type Repuesto } from "@/lib/types";

interface RepuestoFormValues {
  categoria: CategoriaRepuesto;
  descripcion: string;
  cantidad: number;
  etiqueta?: ItemEtiqueta | null;
  prioridad?: ItemPrioridad | null;
  costoEstimado?: number | null;
}

interface RepuestoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RepuestoFormValues) => Promise<void>;
  initialValue?: Repuesto;
  prefillCategoria?: CategoriaRepuesto;
  categoriasExistentes: string[];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">{label}</Label>
      {children}
    </div>
  );
}

export function RepuestoFormDialog({ open, onOpenChange, onSubmit, initialValue, prefillCategoria, categoriasExistentes }: RepuestoFormDialogProps) {
  const isEdit = !!initialValue;

  const [categoria, setCategoria] = useState<CategoriaRepuesto>(initialValue?.categoria ?? prefillCategoria ?? "");
  const [descripcion, setDescripcion] = useState(initialValue?.descripcion ?? "");
  const [cantidad, setCantidad] = useState(initialValue?.cantidad?.toString() ?? "1");
  const [etiqueta, setEtiqueta] = useState<ItemEtiqueta | "Ninguna">(initialValue?.etiqueta ?? "Ninguna");
  const [prioridad, setPrioridad] = useState<ItemPrioridad>(initialValue?.prioridad ?? "Deseable");
  const [costoEstimado, setCostoEstimado] = useState(initialValue?.costoEstimado?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const cantidadNum = parseInt(cantidad, 10);
  const costoNum = costoEstimado ? Number(costoEstimado) : null;
  const canSubmit = categoria.trim().length > 0 && categoria.trim().length <= 80 && descripcion.trim().length > 0
    && Number.isFinite(cantidadNum) && cantidadNum >= 1
    && (costoNum === null || (Number.isFinite(costoNum) && costoNum >= 0));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setPending(true);
    try {
      await onSubmit({
        categoria: categoria.trim(),
        descripcion: descripcion.trim(),
        cantidad: cantidadNum,
        etiqueta: etiqueta === "Ninguna" ? null : etiqueta,
        prioridad: etiqueta === "Necesidad" ? prioridad : null,
        costoEstimado: costoNum,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el repuesto.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">
            {isEdit ? "Editar repuesto" : "Nuevo repuesto"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Repuestos y consumibles de la batería.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Categoría">
            <TipoCombobox value={categoria} onChange={setCategoria} options={categoriasExistentes}
              placeholder="Seleccionar o crear categoría" searchPlaceholder="Buscar o crear categoría..." />
            <p className="mt-1.5 text-xs text-fg-tertiary">Escribí una categoría propia para agregarla.</p>
          </Field>

          <Field label="Descripción">
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Nombre y detalle del repuesto"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Cantidad">
              <Input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="font-mono-num"
              />
            </Field>
            <Field label="Costo estimado (opcional)">
              <Input
                type="number"
                min={0}
                value={costoEstimado}
                onChange={(e) => setCostoEstimado(e.target.value)}
                placeholder="0"
                className="font-mono-num"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Etiqueta">
              <Select value={etiqueta} onValueChange={(v) => setEtiqueta(v as ItemEtiqueta | "Ninguna")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ninguna">Ninguna</SelectItem>
                  <SelectItem value="Necesidad">Necesidad</SelectItem>
                  <SelectItem value="Para venta">Para venta</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {etiqueta === "Necesidad" ? (
              <Field label="Prioridad">
                <Select value={prioridad} onValueChange={(v) => setPrioridad(v as ItemPrioridad)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                    <SelectItem value="Deseable">Deseable</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <div />
            )}
          </div>

          {error && <p className="text-[12.5px] font-medium text-danger">{error}</p>}
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || pending} className="flex-1">
            {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar repuesto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
