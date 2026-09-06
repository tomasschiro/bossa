"use client";

import { useMemo, useState } from "react";
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
import {
  ESTADOS_INSTRUMENTO,
  TIPOS_CAIXA,
  TIPOS_INSTRUMENTO_DEFAULT,
  type Instrumento,
  type InstrumentoEstado,
  type ItemEtiqueta,
  type ItemPrioridad,
  type TipoCaixa,
} from "@/lib/types";

interface InstrumentoFormValues {
  tipo: string;
  marca?: string | null;
  pulgadas?: number | null;
  tipoCaixa?: TipoCaixa | null;
  estado: InstrumentoEstado;
  cantidad: number;
  etiqueta?: ItemEtiqueta | null;
  prioridad?: ItemPrioridad | null;
  costoEstimado?: number | null;
}

interface InstrumentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InstrumentoFormValues) => void;
  initialValue?: Instrumento;
  prefillTipo?: string;
  tiposExistentes: string[];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">{label}</Label>
      {children}
    </div>
  );
}

export function InstrumentoFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValue,
  prefillTipo,
  tiposExistentes,
}: InstrumentoFormDialogProps) {
  const isEdit = !!initialValue;
  const tipoOptions = useMemo(
    () => [...new Set([...TIPOS_INSTRUMENTO_DEFAULT, ...tiposExistentes])],
    [tiposExistentes],
  );

  const [tipo, setTipo] = useState(initialValue?.tipo ?? prefillTipo ?? "");
  const [marca, setMarca] = useState(initialValue?.marca ?? "");
  const [pulgadas, setPulgadas] = useState(initialValue?.pulgadas?.toString() ?? "");
  const [tipoCaixa, setTipoCaixa] = useState<TipoCaixa | "">(initialValue?.tipoCaixa ?? "");
  const [estado, setEstado] = useState<InstrumentoEstado>(initialValue?.estado ?? "Bueno");
  const [cantidad, setCantidad] = useState(initialValue?.cantidad?.toString() ?? "1");
  const [etiqueta, setEtiqueta] = useState<ItemEtiqueta | "Ninguna">(initialValue?.etiqueta ?? "Ninguna");
  const [prioridad, setPrioridad] = useState<ItemPrioridad>(initialValue?.prioridad ?? "Deseable");
  const [costoEstimado, setCostoEstimado] = useState(initialValue?.costoEstimado?.toString() ?? "");

  const cantidadNum = parseInt(cantidad, 10);
  const canSubmit = tipo.trim().length > 0 && Number.isFinite(cantidadNum) && cantidadNum >= 1;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      tipo: tipo.trim(),
      marca: marca.trim() || null,
      pulgadas: pulgadas ? Number(pulgadas) : null,
      tipoCaixa: tipo === "Caixa" && tipoCaixa ? tipoCaixa : null,
      estado,
      cantidad: cantidadNum,
      etiqueta: etiqueta === "Ninguna" ? null : etiqueta,
      prioridad: etiqueta === "Necesidad" ? prioridad : null,
      costoEstimado: costoEstimado ? Number(costoEstimado) : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">
            {isEdit ? "Editar instrumento" : "Nuevo instrumento"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Los instrumentos se agrupan por cantidad, no por unidad individual.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Tipo">
              <TipoCombobox
                value={tipo}
                onChange={(v) => {
                  setTipo(v);
                  if (v !== "Caixa") setTipoCaixa("");
                }}
                options={tipoOptions}
              />
            </Field>
            <Field label="Marca (opcional)">
              <Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ej. Luen" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Pulgadas">
              <Input
                type="number"
                value={pulgadas}
                onChange={(e) => setPulgadas(e.target.value)}
                placeholder="14"
                className="font-mono-num"
              />
            </Field>
            {tipo === "Caixa" ? (
              <Field label="Tipo de Caixa">
                <Select value={tipoCaixa} onValueChange={(v) => setTipoCaixa(v as TipoCaixa)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CAIXA.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
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
            <Field label="Estado">
              <Select value={estado} onValueChange={(v) => setEstado(v as InstrumentoEstado)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_INSTRUMENTO.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cantidad">
              <Input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
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

          <Field label="Costo estimado (opcional)">
            <Input
              type="number"
              value={costoEstimado}
              onChange={(e) => setCostoEstimado(e.target.value)}
              placeholder="0"
              className="font-mono-num"
            />
          </Field>
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            {isEdit ? "Guardar cambios" : "Guardar instrumento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
