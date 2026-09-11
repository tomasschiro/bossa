"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Mail, MessageCircle, Pencil, Check, X } from "lucide-react";
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
import { StatusBadge } from "./status-badge";
import { NaipeVarianteSelect } from "./naipe-variante-select";
import { ESTADOS_LLEGADA, type EstadoLlegada, type Nivel, type Ritmista, type RitmistaEdicion } from "@/lib/types";
import { fullName, initials, naipeAbbr } from "@/lib/ritmistas-utils";
import { updateRitmistaEdicion, updateRitmistaNaipeNivel } from "@/lib/actions";

interface Row {
  ritmista: Ritmista;
  edicion: RitmistaEdicion;
}

interface RitmistasEdTableProps {
  rows: Row[];
  onOpen: (row: Row) => void;
  variantesPorNaipe: Record<string, string[]>;
  onInlineSaved: (updatedRitmista: Ritmista, updatedEdicion: RitmistaEdicion) => void;
}

function waLink(dni: string) {
  return `https://wa.me/549${dni.replace(/\D/g, "")}`;
}

function mailLink(dni: string) {
  return `mailto:${dni.replace(/\D/g, "")}@bossa.app`;
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

function useInlineEdit(onInlineSaved: (updatedRitmista: Ritmista, updatedEdicion: RitmistaEdicion) => void) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [naipe, setNaipe] = useState("");
  const [nivel, setNivel] = useState<Nivel>("Avanzado");
  const [estado, setEstado] = useState<EstadoLlegada>("No confirmado");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function start(row: Row) {
    setEditingId(row.edicion.id);
    setNaipe(row.edicion.naipe);
    setNivel(row.ritmista.nivel);
    setEstado(row.edicion.estadoLlegada);
    setError("");
  }
  function cancel() {
    setEditingId(null);
    setError("");
  }
  function save(row: Row) {
    setError("");
    startTransition(async () => {
      try {
        await Promise.all([
          updateRitmistaEdicion({ id: row.edicion.id, naipe, estadoLlegada: estado }),
          updateRitmistaNaipeNivel({ id: row.ritmista.id, naipeReferencia: naipe, nivel }),
        ]);
        onInlineSaved(
          { ...row.ritmista, naipeReferencia: naipe as Ritmista["naipeReferencia"], nivel },
          { ...row.edicion, naipe, estadoLlegada: estado },
        );
        setEditingId(null);
      } catch {
        setError("No se pudo guardar. Intentá nuevamente.");
      }
    });
  }
  return { editingId, naipe, setNaipe, nivel, setNivel, estado, setEstado, error, pending, start, cancel, save };
}

export function RitmistasEdTable({ rows, onOpen, variantesPorNaipe, onInlineSaved }: RitmistasEdTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const edit = useInlineEdit(onInlineSaved);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected = rows.length > 0 && rows.every(({ edicion }) => selected.has(edicion.id));
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map(({ edicion }) => edicion.id)));
  };

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-auto rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="size-3.5 cursor-pointer rounded border-border-strong accent-foreground"
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Naipe</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ ritmista: r, edicion: re }, i) => {
              const editing = edit.editingId === re.id;
              return (
                <TableRow key={re.id} onClick={editing ? undefined : () => onOpen({ ritmista: r, edicion: re })} className={editing ? "" : "cursor-pointer"}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(re.id)}
                      onChange={() => toggleRow(re.id)}
                      className="size-3.5 cursor-pointer rounded border-border-strong accent-foreground"
                      aria-label={`Seleccionar ${fullName(r)}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono-num text-fg-tertiary">
                    {naipeAbbr(re.naipe)}-{String(i + 1).padStart(2, "0")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <RitmistaAvatar initials={initials(r.nombre, r.apellido)} />
                      <span className="text-foreground underline decoration-border underline-offset-2">
                        {fullName(r)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono-num">{r.dni}</TableCell>
                  <TableCell>
                    <div className="flex gap-3">
                      <a
                        href={waLink(r.dni)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-fg-tertiary hover:text-foreground"
                        aria-label="WhatsApp"
                      >
                        <MessageCircle className="size-4" />
                      </a>
                      <a
                        href={mailLink(r.dni)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-fg-tertiary hover:text-foreground"
                        aria-label="Email"
                      >
                        <Mail className="size-4" />
                      </a>
                    </div>
                  </TableCell>
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
                      <span className="font-mono-num text-[13px] font-medium">{re.naipe}</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => editing && e.stopPropagation()}>
                    {editing ? (
                      <NivelToggle value={edit.nivel} onChange={edit.setNivel} disabled={edit.pending} />
                    ) : (
                      <span className="text-fg-secondary">{r.nivel}</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => editing && e.stopPropagation()}>
                    {editing ? (
                      <select
                        aria-label="Estado de llegada"
                        value={edit.estado}
                        onChange={(e) => edit.setEstado(e.target.value as EstadoLlegada)}
                        disabled={edit.pending}
                        className="h-8 rounded-md border border-border bg-card px-2 text-xs"
                      >
                        {ESTADOS_LLEGADA.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <StatusBadge estado={re.estadoLlegada} />
                    )}
                  </TableCell>
                  <TableCell className="text-fg-tertiary" onClick={(e) => e.stopPropagation()}>
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" aria-label="Guardar" disabled={edit.pending} onClick={() => edit.save({ ritmista: r, edicion: re })}><Check className="size-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Cancelar" disabled={edit.pending} onClick={edit.cancel}><X className="size-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" aria-label={`Editar naipe, nivel y estado de ${fullName(r)}`} onClick={() => edit.start({ ritmista: r, edicion: re })}><Pencil className="size-3.5" /></Button>
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
        {rows.map(({ ritmista: r, edicion: re }) => {
          const editing = edit.editingId === re.id;
          return (
            <div key={re.id} className="bg-card p-3.5">
              <button
                onClick={editing ? undefined : () => onOpen({ ritmista: r, edicion: re })}
                className="flex w-full items-center gap-3.5 text-left"
              >
                <RitmistaAvatar initials={initials(r.nombre, r.apellido)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{fullName(r)}</div>
                  <div className="font-mono-num truncate text-xs text-fg-secondary">{re.naipe}</div>
                </div>
                {!editing && <StatusBadge estado={re.estadoLlegada} />}
              </button>

              {editing ? (
                <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                  <NaipeVarianteSelect value={edit.naipe} onChange={edit.setNaipe} variantesPorNaipe={variantesPorNaipe} disabled={edit.pending} className="flex flex-col gap-2" />
                  <NivelToggle value={edit.nivel} onChange={edit.setNivel} disabled={edit.pending} />
                  <select
                    aria-label="Estado de llegada"
                    value={edit.estado}
                    onChange={(e) => edit.setEstado(e.target.value as EstadoLlegada)}
                    disabled={edit.pending}
                    className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
                  >
                    {ESTADOS_LLEGADA.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {edit.error && <p role="alert" className="text-xs text-danger">{edit.error}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 flex-1 text-xs" disabled={edit.pending} onClick={() => edit.save({ ritmista: r, edicion: re })}>Guardar</Button>
                    <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" disabled={edit.pending} onClick={edit.cancel}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                  <span className="text-xs text-fg-secondary">{r.nivel}</span>
                  <button type="button" aria-label={`Editar naipe, nivel y estado de ${fullName(r)}`} onClick={() => edit.start({ ritmista: r, edicion: re })} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-fg-secondary hover:bg-bg-subtle hover:text-foreground">
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
