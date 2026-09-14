"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

interface EditableCellProps {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  ariaLabel: string;
  className?: string;
  inputClassName?: string;
  /** Transforma cada tecleo, ej. autoformatear DNI o teléfono mientras se escribe. */
  formatValue?: (value: string) => string;
}

/** Texto que se vuelve un input al clickearlo; Enter o blur guarda, Escape cancela. */
export function EditableCell({ value, onSave, ariaLabel, className, inputClassName, formatValue }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function start() {
    setDraft(value);
    setEditing(true);
  }

  async function commit() {
    const next = draft.trim();
    setEditing(false);
    if (next === value) return;
    setPending(true);
    try {
      await onSave(next);
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        aria-label={ariaLabel}
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(formatValue ? formatValue(e.target.value) : e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "h-7 w-full min-w-0 rounded border border-primary bg-card px-1.5 text-sm outline-none",
          inputClassName,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={pending}
      onClick={(e) => { e.stopPropagation(); start(); }}
      className={cn(
        "-mx-1.5 -my-0.5 rounded px-1.5 py-0.5 text-left hover:bg-bg-subtle disabled:opacity-50",
        className,
      )}
    >
      {value || <span className="text-fg-tertiary">—</span>}
    </button>
  );
}
