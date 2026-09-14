"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Filter, Search, Ticket } from "lucide-react";
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
import type { RitmistaOpcion } from "@/lib/types";

const norm = (s: string) => s.toLocaleLowerCase("es");

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
  ocultarUnidadesAsignadas?: boolean;
  /** ritmistaEdicionId de quienes ya son vendedores de este tipo, para avisar antes de asignar de nuevo. */
  yaAsignadosIds?: Set<string>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">{label}</Label>
      {children}
    </div>
  );
}

/** Agrupa variantes de escritura del mismo instrumento (singular/plural, mayúsculas, espacios) bajo una sola clave. */
function normalizarNaipe(naipe: string): string {
  return naipe
    .trim()
    .toLocaleLowerCase("es")
    .replace(/s(\s*\d*\s*"?)$/, "$1");
}

function RitmistaCombobox({
  ritmistas,
  value,
  onChange,
  yaAsignadosIds,
}: {
  ritmistas: RitmistaOpcion[];
  value: string;
  onChange: (ritmistaEdicionId: string) => void;
  yaAsignadosIds?: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const [naipeFiltro, setNaipeFiltro] = useState<string | null>(null);
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [filtroSearch, setFiltroSearch] = useState("");
  const filtroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtroAbierto) return;
    const onClickOutside = (e: MouseEvent) => {
      if (filtroRef.current && !filtroRef.current.contains(e.target as Node)) {
        setFiltroAbierto(false);
        setFiltroSearch("");
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filtroAbierto]);

  const naipeGroups = new Map<string, string>();
  for (const r of ritmistas) {
    const key = normalizarNaipe(r.naipe);
    const label = naipeGroups.get(key);
    if (!label || r.naipe.length < label.length) naipeGroups.set(key, r.naipe);
  }
  const naipes = [...naipeGroups.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  const naipeFiltroLabel = naipeFiltro ? naipeGroups.get(naipeFiltro) : null;
  const naipesFiltrados = naipes.filter(([, label]) => norm(label).includes(norm(filtroSearch.trim())));

  const q = norm(search.trim());
  const visibles = ritmistas.filter(
    (r) =>
      (!naipeFiltro || normalizarNaipe(r.naipe) === naipeFiltro) &&
      (!q || norm(`${r.nombre} ${r.naipe}`).includes(q)),
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative flex items-center border-b border-border">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-tertiary" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre o instrumento..."
          className="h-11 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-fg-tertiary"
        />
        {naipes.length > 1 && (
          <div ref={filtroRef} className="relative shrink-0 border-l border-border">
            <button
              type="button"
              onClick={() => setFiltroAbierto((prev) => !prev)}
              className={`flex h-11 items-center gap-1.5 px-3 text-[12px] font-semibold ${naipeFiltro ? "text-primary" : "text-fg-secondary"}`}
            >
              <Filter className="size-3.5" />
              {naipeFiltroLabel ?? "Instrumento"}
            </button>
            {filtroAbierto && (
              <div className="absolute top-full right-0 z-10 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-md">
                <div className="relative border-b border-border">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-tertiary" />
                  <input
                    autoFocus
                    value={filtroSearch}
                    onChange={(e) => setFiltroSearch(e.target.value)}
                    placeholder="Buscar instrumento..."
                    className="h-9 w-full bg-transparent pl-8 pr-2.5 text-[13px] outline-none placeholder:text-fg-tertiary"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto p-1.5">
                  {!filtroSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setNaipeFiltro(null);
                        setFiltroAbierto(false);
                        setFiltroSearch("");
                      }}
                      className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium ${!naipeFiltro ? "bg-primary text-primary-foreground" : "text-fg-secondary hover:bg-bg-subtle"}`}
                    >
                      Todos
                    </button>
                  )}
                  {naipesFiltrados.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setNaipeFiltro((prev) => (prev === key ? null : key));
                        setFiltroAbierto(false);
                        setFiltroSearch("");
                      }}
                      className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium ${naipeFiltro === key ? "bg-primary text-primary-foreground" : "text-fg-secondary hover:bg-bg-subtle"}`}
                    >
                      {label}
                    </button>
                  ))}
                  {naipesFiltrados.length === 0 && (
                    <p className="p-3 text-center text-xs text-fg-tertiary">Sin resultados.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-h-52 overflow-y-auto">
        {visibles.length === 0 && <p className="p-4 text-center text-xs text-fg-tertiary">Sin resultados.</p>}
        {visibles.map((r) => {
          const yaAsignado = yaAsignadosIds?.has(r.ritmistaEdicionId);
          const seleccionado = r.ritmistaEdicionId === value;
          return (
            <button
              key={r.ritmistaEdicionId}
              type="button"
              onClick={() => onChange(r.ritmistaEdicionId)}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm ${seleccionado ? "bg-primary text-primary-foreground" : "hover:bg-bg-subtle"}`}
            >
              <span className="flex-1 truncate">{r.nombre}</span>
              {yaAsignado && (
                <span
                  className={`inline-flex h-4.5 shrink-0 items-center rounded-full border px-1.5 text-[10px] font-medium ${
                    seleccionado
                      ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                      : "border-warning-soft bg-warning-soft text-warning"
                  }`}
                >
                  Ya asignado
                </span>
              )}
              <span className={`shrink-0 text-xs ${seleccionado ? "text-primary-foreground/80" : "text-fg-tertiary"}`}>{r.naipe}</span>
              {seleccionado && <Check className="size-3.5 shrink-0 text-primary-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VendedorFormDialog({ open, onOpenChange, onSubmit, ritmistas, error, ocultarUnidadesAsignadas, yaAsignadosIds }: VendedorFormDialogProps) {
  const [modo, setModo] = useState<"ritmista" | "externo">("ritmista");
  const [ritmistaEdicionId, setRitmistaEdicionId] = useState(ritmistas[0]?.ritmistaEdicionId ?? "");
  const [nombreExterno, setNombreExterno] = useState("");
  const [contactoExterno, setContactoExterno] = useState("");
  const [unidadesAsignadas, setUnidadesAsignadas] = useState("0");

  const unidadesNum = ocultarUnidadesAsignadas ? 0 : parseInt(unidadesAsignadas, 10);
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
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-lg font-extrabold text-foreground">
            <Ticket className="size-5 text-primary" />
            Asignar rifa
          </DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            Buscá un ritmista por nombre o instrumento, o cargá un colaborador externo.
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
            <Field
              label={
                ritmistas.find((r) => r.ritmistaEdicionId === ritmistaEdicionId)
                  ? `Ritmista · ${ritmistas.find((r) => r.ritmistaEdicionId === ritmistaEdicionId)?.nombre}`
                  : "Ritmista"
              }
            >
              <RitmistaCombobox
                ritmistas={ritmistas}
                value={ritmistaEdicionId}
                onChange={setRitmistaEdicionId}
                yaAsignadosIds={yaAsignadosIds}
              />
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

          {!ocultarUnidadesAsignadas && (
            <Field label="Unidades asignadas">
              <Input
                type="number"
                min={0}
                value={unidadesAsignadas}
                onChange={(e) => setUnidadesAsignadas(e.target.value)}
                className="font-mono-num"
              />
            </Field>
          )}

          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
