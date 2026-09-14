"use client";
import { useState } from "react";
import { cn } from "cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditableSelectCellProps<T extends string> {
  value: T;
  options: T[];
  onSave: (value: T) => Promise<void> | void;
  ariaLabel: string;
  renderValue?: (value: T) => React.ReactNode;
  className?: string;
}

/** Texto que se vuelve un dropdown propio de la app al clickearlo; elegir una opción guarda y cierra. */
export function EditableSelectCell<T extends string>({ value, options, onSave, ariaLabel, renderValue, className }: EditableSelectCellProps<T>) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  async function commit(next: T) {
    setEditing(false);
    if (next === value) return;
    setPending(true);
    try {
      await onSave(next);
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <Select
        value={value}
        open
        onOpenChange={(open) => { if (!open) setEditing(false); }}
        onValueChange={(v) => commit(v as T)}
      >
        <SelectTrigger aria-label={ariaLabel} size="sm" className="h-7 w-full min-w-0" onClick={(e) => e.stopPropagation()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="start" sideOffset={4} onClick={(e) => e.stopPropagation()}>
          {options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={pending}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={cn("-mx-1.5 -my-0.5 rounded px-1.5 py-0.5 text-left hover:bg-bg-subtle disabled:opacity-50", className)}
    >
      {renderValue ? renderValue(value) : value}
    </button>
  );
}
