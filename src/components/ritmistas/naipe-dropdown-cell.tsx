"use client";
import { useState } from "react";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { joinNaipeVariante } from "./naipe-variante-select";
import { useNaipes } from "@/components/naipes/naipes-context";

interface Props {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  variantesPorNaipe: Record<string, string[]>;
  ariaLabel: string;
  className?: string;
}

/**
 * Naipe editable en una celda: dropdown con los naipes base (sin subcategorías,
 * para no alargar la lista); el naipe con variantes abre un submenú lateral con
 * ellas al pasar el mouse, en vez de listarlas todas juntas en el primer nivel.
 */
export function NaipeDropdownCell({ value, onSave, variantesPorNaipe, ariaLabel, className }: Props) {
  const naipes = [...new Set(useNaipes())];
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function commit(next: string) {
    setOpen(false);
    if (next === value) return;
    setPending(true);
    try {
      await onSave(next);
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={pending}
          onClick={(e) => e.stopPropagation()}
          className={cn("-mx-1.5 -my-0.5 rounded px-1.5 py-0.5 text-left hover:bg-bg-subtle disabled:opacity-50", className)}
        >
          {value}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" onClick={(e) => e.stopPropagation()}>
        {naipes.map((n) => {
          const variantes = variantesPorNaipe[n] ?? [];
          if (variantes.length === 0) {
            return (
              <DropdownMenuItem key={n} onSelect={() => commit(n)}>
                {n}
              </DropdownMenuItem>
            );
          }
          return (
            <DropdownMenuSub key={n}>
              <DropdownMenuSubTrigger>{n}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {variantes.map((v) => (
                  <DropdownMenuItem key={v} onSelect={() => commit(joinNaipeVariante(n, v))}>
                    {v}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
