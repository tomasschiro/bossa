"use client";

import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RitmistaAvatar } from "./ritmista-avatar";
import { EditableCell } from "./editable-cell";
import { EditableSelectCell } from "./editable-select-cell";
import { NaipeDropdownCell } from "./naipe-dropdown-cell";
import type { Nivel, Ritmista } from "@/lib/types";
import { formatDni, fullName, initials, naipeHistoryLabel } from "@/lib/ritmistas-utils";
import { updateRitmistaNaipeNivel, updateRitmistaCampo } from "@/lib/actions";

interface RitmistasDbTableProps {
  ritmistas: Ritmista[];
  onOpen: (r: Ritmista) => void;
  variantesPorNaipe: Record<string, string[]>;
  onInlineSaved: (updated: Ritmista) => void;
}

const NIVELES: Nivel[] = ["Avanzado", "Principiante"];

export function RitmistasDbTable({ ritmistas, onOpen, variantesPorNaipe, onInlineSaved }: RitmistasDbTableProps) {
  async function saveNaipe(r: Ritmista, naipeReferencia: string) {
    await updateRitmistaNaipeNivel({ id: r.id, naipeReferencia, nivel: r.nivel });
    onInlineSaved({ ...r, naipeReferencia: naipeReferencia as Ritmista["naipeReferencia"] });
  }
  async function saveNivel(r: Ritmista, nivel: Nivel) {
    await updateRitmistaNaipeNivel({ id: r.id, naipeReferencia: r.naipeReferencia, nivel });
    onInlineSaved({ ...r, nivel });
  }
  async function saveCampo(r: Ritmista, campo: "nombre" | "apellido" | "dni" | "talleRemera" | "calzado", valor: string) {
    await updateRitmistaCampo({ id: r.id, campo, valor });
    onInlineSaved({ ...r, [campo]: valor });
  }

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
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ritmistas.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono-num text-fg-tertiary">{i + 1}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onOpen(r)}
                    className="flex items-center gap-2.5 text-left"
                  >
                    <RitmistaAvatar initials={initials(r.nombre, r.apellido)} />
                    <span className="font-medium text-foreground underline decoration-border underline-offset-2 hover:text-primary">
                      {fullName(r)}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="font-mono-num">
                  <EditableCell
                    value={r.dni}
                    ariaLabel={`DNI de ${fullName(r)}`}
                    onSave={(v) => saveCampo(r, "dni", v)}
                    formatValue={formatDni}
                    inputClassName="font-mono-num"
                  />
                </TableCell>
                <TableCell className="text-fg-secondary">{naipeHistoryLabel(r.historial)}</TableCell>
                <TableCell>
                  <NaipeDropdownCell
                    value={r.naipeReferencia}
                    variantesPorNaipe={variantesPorNaipe}
                    ariaLabel={`Naipe actual de ${fullName(r)}`}
                    onSave={(v) => saveNaipe(r, v)}
                    className="text-fg-secondary"
                  />
                </TableCell>
                <TableCell>
                  <EditableSelectCell
                    value={r.nivel}
                    options={NIVELES}
                    ariaLabel={`Nivel de ${fullName(r)}`}
                    onSave={(v) => saveNivel(r, v)}
                    className="text-fg-secondary"
                  />
                </TableCell>
                <TableCell className="text-fg-secondary">
                  <EditableCell value={r.talleRemera} ariaLabel={`Talle de remera de ${fullName(r)}`} onSave={(v) => saveCampo(r, "talleRemera", v)} />
                </TableCell>
                <TableCell className="font-mono-num">
                  <EditableCell value={r.calzado} ariaLabel={`Calzado de ${fullName(r)}`} onSave={(v) => saveCampo(r, "calzado", v)} inputClassName="font-mono-num" />
                </TableCell>
                <TableCell className="text-right text-fg-secondary">
                  {r.historial.length} {r.historial.length === 1 ? "edición" : "ediciones"}
                </TableCell>
                <TableCell className="text-fg-tertiary">
                  <ChevronRight className="size-4" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border md:hidden">
        {ritmistas.map((r) => (
          <button
            key={r.id}
            onClick={() => onOpen(r)}
            className="flex cursor-pointer items-center gap-3.5 bg-card p-3.5 text-left"
          >
            <RitmistaAvatar initials={initials(r.nombre, r.apellido)} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">{fullName(r)}</div>
              <div className="truncate text-xs text-fg-secondary">
                {r.naipeReferencia} · {r.nivel}
              </div>
            </div>
            <div className="font-mono-num text-right text-xs text-fg-secondary">
              {r.historial.length} {r.historial.length === 1 ? "edición" : "ediciones"}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
