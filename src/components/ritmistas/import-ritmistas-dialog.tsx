"use client";

import { useNaipes } from "@/components/naipes/naipes-context";
import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { downloadRitmistasTemplate } from "@/lib/import-template";

interface ImportRitmistasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportRitmistasDialog({ open, onOpenChange }: ImportRitmistasDialogProps) {
  const naipes = useNaipes();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
  };

  const handleClose = (next: boolean) => {
    if (!next) setFileName(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Importar ritmistas</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Cargá varios ritmistas de una vez desde una planilla.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="rounded-xl border border-border bg-bg-subtle p-4">
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <FileSpreadsheet className="size-4 text-fg-secondary" />
              1. Descargá la plantilla
            </div>
            <p className="mb-3 text-[12.5px] leading-relaxed text-fg-secondary">
              Un archivo .csv (se abre en Excel/Sheets) con las columnas correctas y un ejemplo cargado.
            </p>
            <Button variant="outline" className="w-full gap-1.5 bg-card" onClick={() => downloadRitmistasTemplate(naipes)}>
              <Download className="size-3.5" />
              Descargar plantilla
            </Button>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <Upload className="size-4 text-fg-secondary" />
              2. Subí el archivo completo
            </div>
            <p className="mb-3 text-[12.5px] leading-relaxed text-fg-secondary">
              Formatos aceptados: .csv, .xls, .xlsx.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" className="w-full gap-1.5 bg-card" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-3.5" />
              {fileName ? "Cambiar archivo" : "Seleccionar archivo"}
            </Button>
            {fileName && (
              <div className="mt-2.5 truncate rounded-lg bg-bg-subtle px-3 py-2 text-[12.5px] font-medium text-foreground">
                {fileName}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => handleClose(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button
            className="flex-1"
            disabled={!fileName}
            onClick={() => {
              window.alert(`Importación de "${fileName}" — próximamente.`);
              handleClose(false);
            }}
          >
            Importar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
