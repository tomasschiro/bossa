"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronRight, Mail, MessageCircle, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RitmistaAvatar } from "./ritmista-avatar";
import { StatusBadge } from "./status-badge";
import { NaipeVarianteSelect } from "./naipe-variante-select";
import { EditableCell } from "./editable-cell";
import { EditableSelectCell } from "./editable-select-cell";
import { NaipeDropdownCell } from "./naipe-dropdown-cell";
import { ESTADOS_LLEGADA, type EstadoLlegada, type Nivel, type Ritmista, type RitmistaEdicion } from "@/lib/types";
import { formatDni, fullName, initials, naipeAbbr } from "@/lib/ritmistas-utils";
import { updateRitmistaEdicion, updateRitmistaNaipeNivel, updateRitmistaCampo } from "@/lib/actions";

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

const NIVELES: Nivel[] = ["Avanzado", "Principiante"];

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
          className={`h-8 rounded-full border px-2.5 text-[12px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${value === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-fg-secondary hover:bg-bg-subtle"}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// Mobile mantiene el modo de edición de fila completa (lápiz + Guardar/Cancelar):
// en touch no hay hover para insinuar qué es clickeable, así que un botón explícito
// es más claro que celdas editables sueltas.
function useRowEdit(onInlineSaved: (updatedRitmista: Ritmista, updatedEdicion: RitmistaEdicion) => void) {
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
  const rowEdit = useRowEdit(onInlineSaved);

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

  async function saveNaipe(row: Row, naipe: string) {
    await Promise.all([
      updateRitmistaEdicion({ id: row.edicion.id, naipe, estadoLlegada: row.edicion.estadoLlegada }),
      updateRitmistaNaipeNivel({ id: row.ritmista.id, naipeReferencia: naipe, nivel: row.ritmista.nivel }),
    ]);
    onInlineSaved({ ...row.ritmista, naipeReferencia: naipe as Ritmista["naipeReferencia"] }, { ...row.edicion, naipe });
  }
  async function saveNivel(row: Row, nivel: Nivel) {
    await updateRitmistaNaipeNivel({ id: row.ritmista.id, naipeReferencia: row.ritmista.naipeReferencia, nivel });
    onInlineSaved({ ...row.ritmista, nivel }, row.edicion);
  }
  async function saveEstado(row: Row, estadoLlegada: EstadoLlegada) {
    await updateRitmistaEdicion({ id: row.edicion.id, naipe: row.edicion.naipe, estadoLlegada });
    onInlineSaved(row.ritmista, { ...row.edicion, estadoLlegada });
  }
  async function saveDni(row: Row, dni: string) {
    await updateRitmistaCampo({ id: row.ritmista.id, campo: "dni", valor: dni });
    onInlineSaved({ ...row.ritmista, dni }, row.edicion);
  }

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
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ ritmista: r, edicion: re }, i) => {
              const row = { ritmista: r, edicion: re };
              return (
                <TableRow key={re.id}>
                  <TableCell>
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
                    <button
                      type="button"
                      onClick={() => onOpen(row)}
                      className="flex items-center gap-2.5 text-left"
                    >
                      <RitmistaAvatar initials={initials(r.nombre, r.apellido)} />
                      <span className="text-foreground underline decoration-border underline-offset-2 hover:text-primary">
                        {fullName(r)}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="font-mono-num">
                    <EditableCell value={r.dni} ariaLabel={`DNI de ${fullName(r)}`} onSave={(v) => saveDni(row, v)} formatValue={formatDni} inputClassName="font-mono-num" />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-3">
                      <a href={waLink(r.dni)} target="_blank" rel="noreferrer" className="text-fg-tertiary hover:text-foreground" aria-label="WhatsApp">
                        <MessageCircle className="size-4" />
                      </a>
                      <a href={mailLink(r.dni)} className="text-fg-tertiary hover:text-foreground" aria-label="Email">
                        <Mail className="size-4" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <NaipeDropdownCell
                      value={re.naipe}
                      variantesPorNaipe={variantesPorNaipe}
                      ariaLabel={`Naipe de ${fullName(r)}`}
                      onSave={(v) => saveNaipe(row, v)}
                      className="font-mono-num text-[13px] font-medium"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableSelectCell
                      value={r.nivel}
                      options={NIVELES}
                      ariaLabel={`Nivel de ${fullName(r)}`}
                      onSave={(v) => saveNivel(row, v)}
                      className="text-fg-secondary"
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <EditableSelectCell
                      value={re.estadoLlegada}
                      options={ESTADOS_LLEGADA}
                      ariaLabel={`Estado de llegada de ${fullName(r)}`}
                      onSave={(v) => saveEstado(row, v)}
                      renderValue={(v) => <StatusBadge estado={v} />}
                    />
                  </TableCell>
                  <TableCell className="text-fg-tertiary">
                    <ChevronRight className="size-4" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border md:hidden">
        {rows.map(({ ritmista: r, edicion: re }) => {
          const editing = rowEdit.editingId === re.id;
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
                  <NaipeVarianteSelect value={rowEdit.naipe} onChange={rowEdit.setNaipe} variantesPorNaipe={variantesPorNaipe} disabled={rowEdit.pending} className="flex flex-col gap-2" />
                  <NivelToggle value={rowEdit.nivel} onChange={rowEdit.setNivel} disabled={rowEdit.pending} />
                  <select
                    aria-label="Estado de llegada"
                    value={rowEdit.estado}
                    onChange={(e) => rowEdit.setEstado(e.target.value as EstadoLlegada)}
                    disabled={rowEdit.pending}
                    className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
                  >
                    {ESTADOS_LLEGADA.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {rowEdit.error && <p role="alert" className="text-xs text-danger">{rowEdit.error}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 flex-1 text-xs" disabled={rowEdit.pending} onClick={() => rowEdit.save({ ritmista: r, edicion: re })}>Guardar</Button>
                    <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" disabled={rowEdit.pending} onClick={rowEdit.cancel}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                  <span className="text-xs text-fg-secondary">{r.nivel}</span>
                  <button type="button" aria-label={`Editar naipe, nivel y estado de ${fullName(r)}`} onClick={() => rowEdit.start({ ritmista: r, edicion: re })} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-fg-secondary hover:bg-bg-subtle hover:text-foreground">
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
