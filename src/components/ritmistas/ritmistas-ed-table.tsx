"use client";

import { useState } from "react";
import { ChevronRight, Mail, MessageCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RitmistaAvatar } from "./ritmista-avatar";
import { StatusBadge } from "./status-badge";
import type { Ritmista, RitmistaEdicion } from "@/lib/types";
import { fullName, initials, naipeAbbr } from "@/lib/ritmistas-utils";

interface Row {
  ritmista: Ritmista;
  edicion: RitmistaEdicion;
}

interface RitmistasEdTableProps {
  rows: Row[];
  onOpen: (row: Row) => void;
}

function waLink(dni: string) {
  return `https://wa.me/549${dni.replace(/\D/g, "")}`;
}

function mailLink(dni: string) {
  return `mailto:${dni.replace(/\D/g, "")}@bossa.app`;
}

export function RitmistasEdTable({ rows, onOpen }: RitmistasEdTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
              <TableHead>Estado</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ ritmista: r, edicion: re }, i) => {
              return (
                <TableRow key={re.id} onClick={() => onOpen({ ritmista: r, edicion: re })} className="cursor-pointer">
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
                  <TableCell className="font-mono-num text-[13px] font-medium">{re.naipe}</TableCell>
                  <TableCell>
                    <StatusBadge estado={re.estadoLlegada} />
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
        {rows.map(({ ritmista: r, edicion: re }) => (
          <button
            key={re.id}
            onClick={() => onOpen({ ritmista: r, edicion: re })}
            className="flex cursor-pointer items-center gap-3.5 bg-card p-3.5 text-left"
          >
            <RitmistaAvatar initials={initials(r.nombre, r.apellido)} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">{fullName(r)}</div>
              <div className="font-mono-num truncate text-xs text-fg-secondary">{re.naipe}</div>
            </div>
            <StatusBadge estado={re.estadoLlegada} />
          </button>
        ))}
      </div>
    </>
  );
}
