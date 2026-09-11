"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Pencil, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { RitmistaAvatar } from "./ritmista-avatar";
import { NaipeVarianteSelect } from "./naipe-variante-select";
import type { Nivel, Ritmista } from "@/lib/types";
import { fullName, initials, naipeHistoryLabel } from "@/lib/ritmistas-utils";
import { updateRitmistaNaipeNivel } from "@/lib/actions";

interface RitmistasDbTableProps {
  ritmistas: Ritmista[];
  onOpen: (r: Ritmista) => void;
  variantesPorNaipe: Record<string, string[]>;
  onInlineSaved: (updated: Ritmista) => void;
}

function NivelToggle({ value, onChange, disabled }: { value: Nivel; onChange: (v: Nivel) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1.5">
      {(["Avanzado", "Principiante"] as Nivel[]).map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          aria-pressed={value === opt}
          onClick={() => onChange(opt)}
          className={cn(
            "h-8 rounded-full border px-2.5 text-[12px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
            value === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-fg-secondary hover:bg-bg-subtle",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function useInlineEdit(onInlineSaved: (updated: Ritmista) => void) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [naipe, setNaipe] = useState("");
  const [nivel, setNivel] = useState<Nivel>("Avanzado");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function start(r: Ritmista) {
    setEditingId(r.id);
    setNaipe(r.naipeReferencia);
    setNivel(r.nivel);
    setError("");
  }
  function cancel() {
    setEditingId(null);
    setError("");
  }
  function save(r: Ritmista) {
    setError("");
    startTransition(async () => {
      try {
        await updateRitmistaNaipeNivel({ id: r.id, naipeReferencia: naipe, nivel });
        onInlineSaved({ ...r, naipeReferencia: naipe as Ritmista["naipeReferencia"], nivel });
        setEditingId(null);
      } catch {
        setError("No se pudo guardar. Intentá nuevamente.");
      }
    });
  }
  return { editingId, naipe, setNaipe, nivel, setNivel, error, pending, start, cancel, save };
}

export function RitmistasDbTable({ ritmistas, onOpen, variantesPorNaipe, onInlineSaved }: RitmistasDbTableProps) {
  const edit = useInlineEdit(onInlineSaved);

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-auto rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">N°</TableHead>
              <TableHead>Nombre y Apellido</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Naipe (histórico)</TableHead>
              <TableHead>Naipe actual</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Talle de Remera</TableHead>
              <TableHead>Calzado</TableHead>
              <TableHead className="text-right">Ediciones</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ritmistas.map((r, i) => {
              const editing = edit.editingId === r.id;
              return (
                <TableRow
                  key={r.id}
                  onClick={editing ? undefined : () => onOpen(r)}
                  className={editing ? "" : "cursor-pointer"}
                >
                  <TableCell className="font-mono-num text-fg-tertiary">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <RitmistaAvatar initials={initials(r.nombre, r.apellido)} />
                      <span className="font-medium text-foreground">
                        {fullName(r)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono-num">{r.dni}</TableCell>
                  <TableCell className="text-fg-secondary">{naipeHistoryLabel(r.historial)}</TableCell>
                  <TableCell onClick={(e) => editing && e.stopPropagation()}>
                    {editing ? (
                      <NaipeVarianteSelect
                        value={edit.naipe}
                        onChange={edit.setNaipe}
                        variantesPorNaipe={variantesPorNaipe}
                        disabled={edit.pending}
                        className="flex flex-wrap gap-1.5 [&_button]:h-8 [&_button]:w-32 [&_button]:text-xs"
                      />
                    ) : (
                      <span className="text-fg-secondary">{r.naipeReferencia}</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => editing && e.stopPropagation()}>
                    {editing ? (
                      <NivelToggle value={edit.nivel} onChange={edit.setNivel} disabled={edit.pending} />
                    ) : (
                      <span className="text-fg-secondary">{r.nivel}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-fg-secondary">{r.talleRemera}</TableCell>
                  <TableCell className="font-mono-num">{r.calzado}</TableCell>
                  <TableCell className="text-right text-fg-secondary">
                    {r.historial.length} {r.historial.length === 1 ? "edición" : "ediciones"}
                  </TableCell>
                  <TableCell className="text-fg-tertiary" onClick={(e) => e.stopPropagation()}>
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" aria-label="Guardar" disabled={edit.pending} onClick={() => edit.save(r)}><Check className="size-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Cancelar" disabled={edit.pending} onClick={edit.cancel}><X className="size-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" aria-label={`Editar naipe y nivel de ${fullName(r)}`} onClick={() => edit.start(r)}><Pencil className="size-3.5" /></Button>
                        <ChevronRight className="size-4" />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {edit.error && <p role="alert" className="border-t border-border px-3 py-2 text-xs text-danger">{edit.error}</p>}
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border md:hidden">
        {ritmistas.map((r) => {
          const editing = edit.editingId === r.id;
          return (
            <div key={r.id} className="bg-card p-3.5">
              <button
                onClick={editing ? undefined : () => onOpen(r)}
                className="flex w-full items-center gap-3.5 text-left"
              >
                <RitmistaAvatar initials={initials(r.nombre, r.apellido)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{fullName(r)}</div>
                  <div className="truncate text-xs text-fg-secondary">
                    {naipeHistoryLabel(r.historial)}
                  </div>
                </div>
                {!editing && (
                  <div className="font-mono-num text-right text-xs text-fg-secondary">
                    {r.historial.length} {r.historial.length === 1 ? "edición" : "ediciones"}
                  </div>
                )}
              </button>

              {editing ? (
                <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                  <NaipeVarianteSelect value={edit.naipe} onChange={edit.setNaipe} variantesPorNaipe={variantesPorNaipe} disabled={edit.pending} className="flex flex-col gap-2" />
                  <NivelToggle value={edit.nivel} onChange={edit.setNivel} disabled={edit.pending} />
                  {edit.error && <p role="alert" className="text-xs text-danger">{edit.error}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 flex-1 text-xs" disabled={edit.pending} onClick={() => edit.save(r)}>Guardar</Button>
                    <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" disabled={edit.pending} onClick={edit.cancel}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                  <span className="text-xs text-fg-secondary">{r.naipeReferencia} · {r.nivel}</span>
                  <button type="button" aria-label={`Editar naipe y nivel de ${fullName(r)}`} onClick={() => edit.start(r)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-fg-secondary hover:bg-bg-subtle hover:text-foreground">
                    <Pencil className="size-3.5" />Editar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
