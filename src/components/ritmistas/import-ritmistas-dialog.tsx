"use client";

import { useNaipes } from "@/components/naipes/naipes-context";
import { useEffect, useRef, useState, useTransition } from "react";
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { downloadRitmistasTemplate } from "@/lib/import-template";
import { parseCsv } from "@/lib/csv-parser";
import { createRitmistasBulk, type ImportRitmistaFila, type ImportRitmistasResultado } from "@/lib/actions";

interface ImportRitmistasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edicionId?: string;
  onImported?: () => void;
}

function filasDesdeCsv(texto: string): { filas: ImportRitmistaFila[]; errorFormato: string | null } {
  const registros = parseCsv(texto);
  if (registros.length === 0) return { filas: [], errorFormato: "El archivo está vacío." };

  const primeraEsHeader = /nombre/i.test(registros[0][0] ?? "");
  const dataRows = primeraEsHeader ? registros.slice(1) : registros;

  const filas: ImportRitmistaFila[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i];
    // La plantilla agrega una línea final "Instrumentos válidos: ..." — se ignora.
    if (/instrumentos válidos/i.test(cols[0] ?? "")) continue;
    const [nombre = "", apellido = "", dni = "", telefono = "", nacimientoIso = "", naipeReferencia = "", talleRemera = "", calzado = ""] = cols;
    if (![nombre, apellido, dni, telefono, nacimientoIso, naipeReferencia, talleRemera, calzado].some((c) => c.trim())) continue;
    filas.push({
      fila: (primeraEsHeader ? i + 2 : i + 1),
      nombre, apellido, dni, telefono, nacimientoIso, naipeReferencia, talleRemera, calzado,
    });
  }
  return { filas, errorFormato: null };
}

export function ImportRitmistasDialog({ open, onOpenChange, edicionId, onImported }: ImportRitmistasDialogProps) {
  const naipes = useNaipes();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [filas, setFilas] = useState<ImportRitmistaFila[]>([]);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ImportRitmistasResultado | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setFileName(null);
    setFilas([]);
    setErrorArchivo(null);
    setResultado(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setResultado(null);
    if (!file) { setFileName(null); setFilas([]); setErrorArchivo(null); return; }
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setFilas([]);
      setErrorArchivo("Por ahora solo se puede importar .csv. Descargá la plantilla, completala en Excel/Sheets y exportala como CSV.");
      return;
    }
    const texto = await file.text();
    const { filas: parsed, errorFormato } = filasDesdeCsv(texto);
    if (errorFormato) { setFilas([]); setErrorArchivo(errorFormato); return; }
    if (parsed.length === 0) { setFilas([]); setErrorArchivo("No se encontraron filas con datos en el archivo."); return; }
    setFilas(parsed);
    setErrorArchivo(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  useEffect(() => {
    if (resultado && resultado.creados > 0) onImported?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  const handleImport = () => {
    if (filas.length === 0) return;
    startTransition(async () => {
      const res = await createRitmistasBulk(filas, edicionId);
      setResultado(res);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-lg">
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
              Un archivo .csv (se abre en Excel/Sheets) con las columnas correctas y un ejemplo cargado. El instrumento debe ser uno de los de la batería: {naipes.join(", ")}.
            </p>
            <Button variant="outline" className="w-full gap-1.5 bg-card" onClick={() => downloadRitmistasTemplate(naipes)}>
              <Download className="size-3.5" />
              Descargar plantilla
            </Button>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <Upload className="size-4 text-fg-secondary" />
              2. Subí el archivo completo como CSV
            </div>
            <p className="mb-3 text-[12.5px] leading-relaxed text-fg-secondary">
              Exportá la planilla completa como .csv y subila acá.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
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
            {errorArchivo && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-[12.5px] font-medium text-danger">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {errorArchivo}
              </div>
            )}
            {filas.length > 0 && !resultado && (
              <div className="mt-2.5 rounded-lg bg-success/10 px-3 py-2 text-[12.5px] font-medium text-success">
                {filas.length} {filas.length === 1 ? "fila lista" : "filas listas"} para importar.
              </div>
            )}
          </div>

          {resultado && (
            <div className="rounded-xl border border-border p-4">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-success" />
                {resultado.creados} {resultado.creados === 1 ? "ritmista creado" : "ritmistas creados"}
              </div>
              {resultado.errores.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[12.5px] font-semibold text-danger">
                    {resultado.errores.length} {resultado.errores.length === 1 ? "fila con error" : "filas con error"}:
                  </p>
                  <ul className="max-h-32 space-y-1 overflow-y-auto text-[12.5px] text-fg-secondary">
                    {resultado.errores.map((e) => (
                      <li key={e.fila}>Fila {e.fila}: {e.motivo}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => handleClose(false)} className="flex-1 bg-card">
            {resultado ? "Cerrar" : "Cancelar"}
          </Button>
          {!resultado && (
            <Button
              className="flex-1"
              disabled={filas.length === 0 || pending}
              onClick={handleImport}
            >
              {pending ? "Importando…" : `Importar${filas.length ? ` (${filas.length})` : ""}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
