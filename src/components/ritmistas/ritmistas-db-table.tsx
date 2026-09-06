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
import type { Ritmista } from "@/lib/types";
import { fullName, initials, naipeHistoryLabel } from "@/lib/ritmistas-utils";

interface RitmistasDbTableProps {
  ritmistas: Ritmista[];
  onOpen: (r: Ritmista) => void;
}

export function RitmistasDbTable({ ritmistas, onOpen }: RitmistasDbTableProps) {
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
              <TableHead>Talle de Remera</TableHead>
              <TableHead>Calzado</TableHead>
              <TableHead className="text-right">Ediciones</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ritmistas.map((r, i) => (
              <TableRow
                key={r.id}
                onClick={() => onOpen(r)}
                className="cursor-pointer"
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
                <TableCell className="text-fg-secondary">{r.talleRemera}</TableCell>
                <TableCell className="font-mono-num">{r.calzado}</TableCell>
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
                {naipeHistoryLabel(r.historial)}
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
